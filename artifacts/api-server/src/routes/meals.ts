import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateMealBody,
  CreateMealResponse,
  DeleteMealParams,
  MealCompletionResponse,
  SetMealCompletionBody,
  SetMealCompletionParams,
  UpdateMealBody,
  UpdateMealParams,
  UpdateMealResponse,
} from "@workspace/api-zod";
import {
  db,
  mealCompletionsTable,
  mealsTable,
} from "@workspace/db";
import { authenticatedUserId } from "../middlewares/require-auth";
import { assertIsoDate } from "../lib/dates";
import { HttpError } from "../lib/http-error";
import { listMealsForDate } from "../lib/meal-data";
import { ensureUserSetup } from "../lib/user-setup";

const router: IRouter = Router();

router.get("/meals", async (req, res) => {
  const date = assertIsoDate(String(req.query.date ?? ""));
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);
  res.json(await listMealsForDate(userId, date));
});

router.post("/meals", async (req, res) => {
  const body = CreateMealBody.parse(req.body);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  const [meal] = await db
    .insert(mealsTable)
    .values({
      userId,
      name: body.name.trim(),
      time: body.time,
      note: body.note?.trim() ?? "",
      weekdays: body.weekdays,
    })
    .returning({
      id: mealsTable.id,
      name: mealsTable.name,
      time: mealsTable.time,
      note: mealsTable.note,
      weekdays: mealsTable.weekdays,
    });

  res.status(201).json(CreateMealResponse.parse(meal));
});

router.patch("/meals/:id", async (req, res) => {
  const { id } = UpdateMealParams.parse(req.params);
  const body = UpdateMealBody.parse(req.body);
  if (Object.keys(body).length === 0) {
    throw new HttpError(400, "At least one meal field is required");
  }

  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);
  const [meal] = await db
    .update(mealsTable)
    .set({
      ...body,
      ...(body.name === undefined ? {} : { name: body.name.trim() }),
      ...(body.note === undefined ? {} : { note: body.note.trim() }),
      updatedAt: new Date(),
    })
    .where(and(eq(mealsTable.id, id), eq(mealsTable.userId, userId)))
    .returning({
      id: mealsTable.id,
      name: mealsTable.name,
      time: mealsTable.time,
      note: mealsTable.note,
      weekdays: mealsTable.weekdays,
    });

  if (!meal) throw new HttpError(404, "Meal not found");
  res.json(UpdateMealResponse.parse(meal));
});

router.delete("/meals/:id", async (req, res) => {
  const { id } = DeleteMealParams.parse(req.params);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  const [deleted] = await db
    .delete(mealsTable)
    .where(and(eq(mealsTable.id, id), eq(mealsTable.userId, userId)))
    .returning({ id: mealsTable.id });

  if (!deleted) throw new HttpError(404, "Meal not found");
  res.status(204).end();
});

router.put("/meals/:id/completion", async (req, res) => {
  const { id } = SetMealCompletionParams.parse(req.params);
  const body = SetMealCompletionBody.parse(req.body);
  const date = assertIsoDate(body.date);
  const userId = authenticatedUserId(req);
  await ensureUserSetup(userId);

  const [meal] = await db
    .select({ id: mealsTable.id })
    .from(mealsTable)
    .where(and(eq(mealsTable.id, id), eq(mealsTable.userId, userId)))
    .limit(1);
  if (!meal) throw new HttpError(404, "Meal not found");

  if (body.completed) {
    await db
      .insert(mealCompletionsTable)
      .values({ userId, mealId: id, completedOn: date })
      .onConflictDoNothing();
  } else {
    await db
      .delete(mealCompletionsTable)
      .where(
        and(
          eq(mealCompletionsTable.userId, userId),
          eq(mealCompletionsTable.mealId, id),
          eq(mealCompletionsTable.completedOn, date),
        ),
      );
  }

  res.json(
    MealCompletionResponse.parse({
      mealId: id,
      date,
      completed: body.completed,
    }),
  );
});

export default router;
