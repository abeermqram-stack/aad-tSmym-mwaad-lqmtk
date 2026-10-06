import { createInsertSchema } from "drizzle-zod";
import { date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { mealsTable } from "./meals";

export const pushSubscriptionsTable = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    expirationTime: timestamp("expiration_time", { withTimezone: true }),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("push_subscriptions_user_idx").on(table.userId)],
);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscriptionRecord = typeof pushSubscriptionsTable.$inferSelect;

export const pushVapidConfigTable = pgTable("push_vapid_config", {
  id: integer("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  encryptionIv: text("encryption_iv").notNull(),
  encryptionTag: text("encryption_tag").notNull(),
  subject: text("subject").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reminderDeliveriesTable = pgTable(
  "reminder_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    mealId: uuid("meal_id").notNull().references(() => mealsTable.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reminder_deliveries_user_meal_date_idx").on(table.userId, table.mealId, table.scheduledDate),
    index("reminder_deliveries_date_idx").on(table.scheduledDate),
  ],
);
