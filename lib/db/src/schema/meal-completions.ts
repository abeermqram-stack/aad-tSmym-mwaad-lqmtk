import { createInsertSchema } from "drizzle-zod";
import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { mealsTable } from "./meals";

export const mealCompletionsTable = pgTable(
  "meal_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    mealId: uuid("meal_id").notNull().references(() => mealsTable.id, { onDelete: "cascade" }),
    completedOn: date("completed_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("meal_completions_user_meal_date_idx").on(table.userId, table.mealId, table.completedOn),
    index("meal_completions_user_date_idx").on(table.userId, table.completedOn),
  ],
);

export const insertMealCompletionSchema = createInsertSchema(mealCompletionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMealCompletion = z.infer<typeof insertMealCompletionSchema>;
export type MealCompletionRecord = typeof mealCompletionsTable.$inferSelect;
