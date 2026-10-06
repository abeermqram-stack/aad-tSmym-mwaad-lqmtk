import { db, mealsTable, userPreferencesTable } from "@workspace/db";

const STARTER_MEALS = [
  { name: "الفطور", time: "08:00", note: "ابدأ يومك بشيء يشبعك" },
  { name: "الغداء", time: "13:30", note: "وجبة متوازنة تعطيك طاقة" },
  { name: "وجبة خفيفة", time: "16:30", note: "استراحة صغيرة بين الوجبات" },
  { name: "العشاء", time: "20:00", note: "خفيف ولذيذ لنهاية يومك" },
];

export async function ensureUserSetup(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(userPreferencesTable)
      .values({ userId })
      .onConflictDoNothing()
      .returning({ userId: userPreferencesTable.userId });

    if (!created) return;

    await tx.insert(mealsTable).values(
      STARTER_MEALS.map((meal) => ({
        ...meal,
        userId,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      })),
    );
  });
}
