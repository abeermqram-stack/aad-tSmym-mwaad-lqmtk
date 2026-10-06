import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetPreferencesResponse,
  UpdatePreferencesBody,
  UpdatePreferencesResponse,
} from "@workspace/api-zod";
import { db, pushSubscriptionsTable, userPreferencesTable } from "@workspace/db";
import { authenticatedUserId } from "../middlewares/require-auth";
import { HttpError } from "../lib/http-error";
import { ensureUserSetup } from "../lib/user-setup";

const router: IRouter = Router();

async function buildPreferencesResponse(userId: string) {
  const [[preferences], subscriptions] = await Promise.all([
    db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, userId))
      .limit(1),
    db
      .select({ id: pushSubscriptionsTable.id })
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId)),
  ]);
  const deviceCount = subscriptions.length;

  return GetPreferencesResponse.parse({
    remindersEnabled: preferences?.remindersEnabled ?? true,
    timezone: preferences?.timezone ?? "Asia/Riyadh",
    pushEnabled: deviceCount > 0,
    deviceCount,
  });
}

router.get("/preferences", async (req, res) => {
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);
  res.json(await buildPreferencesResponse(userId));
});

router.patch("/preferences", async (req, res) => {
  const body = UpdatePreferencesBody.parse(req.body);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  if (body.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: body.timezone }).format(new Date());
    } catch {
      throw new HttpError(400, "Invalid time zone");
    }
  }

  if (Object.keys(body).length > 0) {
    await db
      .update(userPreferencesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(userPreferencesTable.userId, userId));
  }

  res.json(
    UpdatePreferencesResponse.parse(
      await buildPreferencesResponse(userId),
    ),
  );
});

export default router;
