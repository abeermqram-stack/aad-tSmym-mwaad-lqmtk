import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreatePushSubscriptionBody,
  CreatePushSubscriptionResponse,
  DeletePushSubscriptionBody,
  DeletePushSubscriptionResponse,
  GetPushPublicKeyResponse,
  GetPushStatusResponse,
  SendTestNotificationResponse,
} from "@workspace/api-zod";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { authenticatedUserId, requireAuth } from "../middlewares/require-auth";
import { HttpError } from "../lib/http-error";
import { getOrCreateVapidConfig, sendPushToUser, validatePushEndpoint } from "../lib/push-service";
import { ensureUserSetup } from "../lib/user-setup";

const router: IRouter = Router();

router.get("/push/public-key", async (req, res) => {
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "";
  const config = await getOrCreateVapidConfig(host);
  res.json(
    GetPushPublicKeyResponse.parse({
      publicKey: config.publicKey,
      enabled: true,
    }),
  );
});

router.use(requireAuth);

router.get("/push/status", async (req, res) => {
  const userId = authenticatedUserId(req);
  const subscriptions = await db
    .select({ id: pushSubscriptionsTable.id })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));
  res.json(
    GetPushStatusResponse.parse({
      pushEnabled: subscriptions.length > 0,
      deviceCount: subscriptions.length,
    }),
  );
});

router.post("/push/subscriptions", async (req, res) => {
  const body = CreatePushSubscriptionBody.parse(req.body);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  let endpoint: string;
  try {
    endpoint = validatePushEndpoint(body.endpoint);
  } catch {
    throw new HttpError(400, "Push endpoint must use a public HTTPS host");
  }

  const values = {
    userId,
    endpoint,
    expirationTime:
      typeof body.expirationTime === "number"
        ? new Date(body.expirationTime)
        : null,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    updatedAt: new Date(),
  };

  const [subscription] = await db
    .insert(pushSubscriptionsTable)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: values,
      setWhere: eq(pushSubscriptionsTable.userId, userId),
    })
    .returning({ id: pushSubscriptionsTable.id });

  if (!subscription) {
    throw new HttpError(409, "This browser subscription belongs to another account");
  }

  const deviceCount = await db
    .select({ id: pushSubscriptionsTable.id })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));
  res.status(201).json(
    CreatePushSubscriptionResponse.parse({
      pushEnabled: deviceCount.length > 0,
      deviceCount: deviceCount.length,
    }),
  );
});

router.delete("/push/subscriptions", async (req, res) => {
  const body = DeletePushSubscriptionBody.parse(req.body);
  const userId = authenticatedUserId(req);
  let endpoint: string;
  try {
    endpoint = validatePushEndpoint(body.endpoint);
  } catch {
    throw new HttpError(400, "Push endpoint must use a public HTTPS host");
  }

  await db
    .delete(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.userId, userId),
        eq(pushSubscriptionsTable.endpoint, endpoint),
      ),
    );
  const subscriptions = await db
    .select({ id: pushSubscriptionsTable.id })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));
  res.json(
    DeletePushSubscriptionResponse.parse({
      pushEnabled: subscriptions.length > 0,
      deviceCount: subscriptions.length,
    }),
  );
});

router.post("/push/test", async (req, res) => {
  const userId = authenticatedUserId(req);
  const result = await sendPushToUser(userId, {
    title: "موعد لقمتك",
    body: "هذا تذكير تجريبي. نذكّرك بلطف في وقت وجبتك.",
    tag: "meal-planner-test",
    url: "/app",
    icon: "/icons/icon-192.png",
  });
  const message =
    result.deviceCount === 0
      ? "فعّل الإشعارات على جهازك أولًا."
      : result.sent
        ? "تم إرسال الإشعار التجريبي."
        : "تعذّر إرسال الإشعار. تحقق من اتصال جهازك.";
  res.json(
    SendTestNotificationResponse.parse({
      sent: result.sent,
      deviceCount: result.deviceCount,
      message,
    }),
  );
});

export default router;
