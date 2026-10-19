import { Kysely } from "kysely";
import { type DbSchema } from "./types.ts";

interface AnswerFeedback {
  answerId: number;
  correct: boolean;
}

const saveTestGrade = async (
  db: Kysely<DbSchema>,
  testId: number,
  finalGrade: number,
  answersFeedback: AnswerFeedback[],
) => {
  await Promise.all(
    answersFeedback.map((feedback) =>
      db
        .updateTable("test_answer")
        .set({
          correct: (feedback.correct ? 1 : 0) as any,
        })
        .where("id", "=", feedback.answerId)
        .execute(),
    ),
  );

  await db
    .updateTable("test")
    .set({ grade: finalGrade })
    .where("id", "=", testId)
    .execute();
};

export default saveTestGrade;
