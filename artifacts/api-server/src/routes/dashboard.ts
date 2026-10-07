import { and, eq, gte, lte } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetJourneySummaryQueryParams,
  GetJourneySummaryResponse,
} from "@workspace/api-zod";
import { db, mealCompletionsTable, mealsTable, userPreferencesTable } from "@workspace/db";
import { authenticatedUserId } from "../middlewares/require-auth";
import { assertIsoDate, dateRangeInclusive, getLocalDateTime, weekdayForDate } from "../lib/dates";
import { listMealsForDate } from "../lib/meal-data";
import { ensureUserSetup } from "../lib/user-setup";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  const parsed = GetDashboardSummaryQueryParams.parse(req.query);
  const date = typeof parsed.date === "string" ? parsed.date : (parsed.date as Date).toISOString().slice(0, 10);
  assertIsoDate(date);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  const [preferences] = await db
    .select({ timezone: userPreferencesTable.timezone })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);
  const meals = await listMealsForDate(userId, date);
  const localNow = getLocalDateTime(new Date(), preferences?.timezone ?? "Asia/Riyadh");
  const nextMeal =
    date === localNow.date
      ? meals.find((meal) => !meal.completed && meal.time >= localNow.time) ?? null
      : null;

  res.json(
    GetDashboardSummaryResponse.parse({
      date,
      totalCount: meals.length,
      doneCount: meals.filter((meal) => meal.completed).length,
      progress: meals.length
        ? (meals.filter((meal) => meal.completed).length / meals.length) * 100
        : 0,
      nextMeal,
    }),
  );
});

router.get("/journey/summary", async (req, res) => {
  const parsed = GetJourneySummaryQueryParams.parse(req.query);
  const startDate = typeof parsed.startDate === "string" ? parsed.startDate : (parsed.startDate as Date).toISOString().slice(0, 10);
  const endDate = typeof parsed.endDate === "string" ? parsed.endDate : (parsed.endDate as Date).toISOString().slice(0, 10);
  const dates = dateRangeInclusive(startDate, endDate);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  const [mealRows, completionRows] = await Promise.all([
    db
      .select({ id: mealsTable.id, weekdays: mealsTable.weekdays })
      .from(mealsTable)
      .where(eq(mealsTable.userId, userId)),
    db
      .select({
        mealId: mealCompletionsTable.mealId,
        date: mealCompletionsTable.completedOn,
      })
      .from(mealCompletionsTable)
      .where(
        and(
          eq(mealCompletionsTable.userId, userId),
          gte(mealCompletionsTable.completedOn, startDate),
          lte(mealCompletionsTable.completedOn, endDate),
        ),
      ),
  ]);

  const completedByDate = new Map<string, Set<string>>();
  for (const completion of completionRows) {
    const ids = completedByDate.get(completion.date) ?? new Set<string>();
    ids.add(completion.mealId);
    completedByDate.set(completion.date, ids);
  }

  const summary = dates.map((date) => {
    const weekday = weekdayForDate(date);
    const scheduledMeals = mealRows.filter((meal) => meal.weekdays.includes(weekday));
    const completedIds = completedByDate.get(date) ?? new Set<string>();
    return {
      date,
      totalCount: scheduledMeals.length,
      doneCount: scheduledMeals.filter((meal) => completedIds.has(meal.id)).length,
    };
  });

  res.json(GetJourneySummaryResponse.parse(summary));
});

export default router;
