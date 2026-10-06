import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const mealsTable = pgTable(
  "meal_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    time: text("time").notNull(),
    note: text("note").notNull().default(""),
    weekdays: integer("weekdays").array().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("meal_plans_user_time_idx").on(table.userId, table.time)],
);

export const insertMealSchema = createInsertSchema(mealsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type MealRecord = typeof mealsTable.$inferSelect;
