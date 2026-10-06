import { and, eq } from "drizzle-orm";
import {
  db,
  mealsTable,
  pushSubscriptionsTable,
  reminderDeliveriesTable,
  userPreferencesTable,
} from "@workspace/db";
import { getLocalDateTime } from "./dates";
import { logger } from "./logger";
import { sendPushToUser } from "./push-service";

let started = false;
let running = false;

async function sendDueReminders(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const [scheduledMeals, registeredUsers] = await Promise.all([
      db
        .select({
          id: mealsTable.id,
          userId: mealsTable.userId,
          name: mealsTable.name,
          time: mealsTable.time,
          weekdays: mealsTable.weekdays,
          timezone: userPreferencesTable.timezone,
        })
        .from(mealsTable)
        .innerJoin(
          userPreferencesTable,
          eq(userPreferencesTable.userId, mealsTable.userId),
        )
        .where(eq(userPreferencesTable.remindersEnabled, true)),
      db
        .select({ userId: pushSubscriptionsTable.userId })
        .from(pushSubscriptionsTable),
    ]);
    const userIdsWithPush = new Set(registeredUsers.map((item) => item.userId));

    for (const meal of scheduledMeals) {
      if (!userIdsWithPush.has(meal.userId)) continue;

      let local: ReturnType<typeof getLocalDateTime>;
      try {
        local = getLocalDateTime(now, meal.timezone);
      } catch (error) {
        logger.warn({ userId: meal.userId, err: error }, "Skipping reminder with invalid time zone");
        continue;
      }

      if (meal.time !== local.time || !meal.weekdays.includes(local.weekday)) continue;

      const [delivery] = await db
        .insert(reminderDeliveriesTable)
        .values({
          userId: meal.userId,
          mealId: meal.id,
          scheduledDate: local.date,
        })
        .onConflictDoNothing()
        .returning({ id: reminderDeliveriesTable.id });
      if (!delivery) continue;

      try {
        const result = await sendPushToUser(meal.userId, {
          title: "حان موعد وجبتك",
          body: `${meal.name}${meal.time ? `، ${meal.time}` : ""}`,
          tag: `meal-${meal.id}-${local.date}`,
          url: "/app",
          icon: "/icons/icon-192.png",
        });
        if (!result.sent) {
          await db
            .delete(reminderDeliveriesTable)
            .where(eq(reminderDeliveriesTable.id, delivery.id));
        }
      } catch (error) {
        await db
          .delete(reminderDeliveriesTable)
          .where(
            and(
              eq(reminderDeliveriesTable.id, delivery.id),
              eq(reminderDeliveriesTable.userId, meal.userId),
            ),
          );
        logger.error({ userId: meal.userId, mealId: meal.id, err: error }, "Could not send meal reminder");
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Reminder scheduler check failed");
  } finally {
    running = false;
  }
}

export function startReminderScheduler(): void {
  if (started) return;
  started = true;
  const timer = setInterval(() => {
    void sendDueReminders();
  }, 15_000);
  timer.unref();
  void sendDueReminders();
  logger.info("Meal reminder scheduler started");
}
