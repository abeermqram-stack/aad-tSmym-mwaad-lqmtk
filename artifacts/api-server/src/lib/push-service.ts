import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import {
  db,
  pushSubscriptionsTable,
  pushVapidConfigTable,
} from "@workspace/db";
import { logger } from "./logger";

export type NotificationPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
  icon: string;
};

export type PushSendResult = {
  sent: boolean;
  deviceCount: number;
  successCount: number;
};

function encryptionKey(): Buffer {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required to protect the push private key");
  }
  return createHash("sha256").update(sessionSecret).digest();
}

function encryptPrivateKey(privateKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedPrivateKey: ciphertext.toString("base64"),
    encryptionIv: iv.toString("base64"),
    encryptionTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptPrivateKey(config: {
  encryptedPrivateKey: string;
  encryptionIv: string;
  encryptionTag: string;
}) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(config.encryptionIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(config.encryptionTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(config.encryptedPrivateKey, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function validSubject(host: string): string {
  const normalizedHost = host.split(",")[0]?.trim() ?? "";
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(normalizedHost)) {
    throw new Error("A valid public host is required to configure push notifications");
  }
  return `https://${normalizedHost}`;
}

export async function getOrCreateVapidConfig(host: string) {
  const [existing] = await db
    .select()
    .from(pushVapidConfigTable)
    .where(eq(pushVapidConfigTable.id, 1))
    .limit(1);
  if (existing) return existing;

  const keys = webpush.generateVAPIDKeys();
  const encrypted = encryptPrivateKey(keys.privateKey);
  await db
    .insert(pushVapidConfigTable)
    .values({
      id: 1,
      publicKey: keys.publicKey,
      ...encrypted,
      subject: validSubject(host),
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(pushVapidConfigTable)
    .where(eq(pushVapidConfigTable.id, 1))
    .limit(1);
  if (!created) {
    throw new Error("Could not initialize web push configuration");
  }
  return created;
}

function statusCodeFrom(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return undefined;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : undefined;
}

export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload,
): Promise<PushSendResult> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  if (subscriptions.length === 0) {
    return { sent: false, deviceCount: 0, successCount: 0 };
  }

  const [config] = await db
    .select()
    .from(pushVapidConfigTable)
    .where(eq(pushVapidConfigTable.id, 1))
    .limit(1);
  if (!config) {
    return { sent: false, deviceCount: subscriptions.length, successCount: 0 };
  }

  webpush.setVapidDetails(
    config.subject,
    config.publicKey,
    decryptPrivateKey(config),
  );
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime?.valueOf() ?? null,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
        { TTL: 60 },
      ),
    ),
  );

  let successCount = 0;
  await Promise.all(
    results.map(async (result, index) => {
      if (result.status === "fulfilled") {
        successCount += 1;
        return;
      }

      const subscription = subscriptions[index];
      const statusCode = statusCodeFrom(result.reason);
      if (statusCode === 404 || statusCode === 410) {
        await db
          .delete(pushSubscriptionsTable)
          .where(
            and(
              eq(pushSubscriptionsTable.id, subscription.id),
              eq(pushSubscriptionsTable.userId, userId),
            ),
          );
        return;
      }

      logger.warn(
        { userId, statusCode },
        "Web push delivery failed",
      );
    }),
  );

  return {
    sent: successCount > 0,
    deviceCount: subscriptions.length,
    successCount,
  };
}

export function validatePushEndpoint(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Push subscription endpoint must be a valid URL");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    isIP(hostname) !== 0 ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test")
  ) {
    throw new Error("Push subscription endpoint must use a public HTTPS host");
  }
  return url.toString();
}
