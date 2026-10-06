import { and, arrayContains, asc, eq } from "drizzle-orm";
import { db, mealCompletionsTable, mealsTable } from "@workspace/db";
import { ListMealsResponse } from "@workspace/api-zod";
import { weekdayForDate } from "./dates";

export async function listMealsForDate(userId: string, date: string) {
  const weekday = weekdayForDate(date);
  const rows = await db
    .select({
      id: mealsTable.id,
      name: mealsTable.name,
      time: mealsTable.time,
      note: mealsTable.note,
      weekdays: mealsTable.weekdays,
      completionId: mealCompletionsTable.id,
    })
    .from(mealsTable)
    .leftJoin(
      mealCompletionsTable,
      and(
        eq(mealCompletionsTable.mealId, mealsTable.id),
        eq(mealCompletionsTable.userId, userId),
        eq(mealCompletionsTable.completedOn, date),
      ),
    )
    .where(and(eq(mealsTable.userId, userId), arrayContains(mealsTable.weekdays, [weekday])))
    .orderBy(asc(mealsTable.time));

  return ListMealsResponse.parse(
    rows.map(({ completionId, ...meal }) => ({
      ...meal,
      completed: completionId !== null,
    })),
  );
}
