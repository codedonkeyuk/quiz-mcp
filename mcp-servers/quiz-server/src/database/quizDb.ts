import { Kysely, sql } from "kysely";
import type { DbSchema } from "./types.ts";
import { db, type DecoratedSchemaBuilder } from "@mcp-packages/database";

export const quizDb = async (database: string = "/data/quiz.sqlite") =>
  await db<DbSchema>(
    database,
    async (schema: DecoratedSchemaBuilder<DbSchema>) => {
      await schema
        .createTable("topic")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull().unique())
        .execute();

      await schema
        .createTable("test")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("date", "text", (col) => col.notNull())
        .addColumn("topic_id", "integer", (col) =>
          col.references("topic.id").onDelete("cascade").notNull(),
        )
        .execute();

      await schema
        .createTable("question")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("question", "text", (col) => col.notNull())
        .addColumn("topic_id", "integer", (col) =>
          col.references("topic.id").onDelete("cascade").notNull(),
        )
        .execute();

      await schema
        .createTable("test_answer")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("answer", "text", (col) => col.notNull())
        .addColumn("correct", "boolean", (col) => col.notNull())
        .addColumn("test_id", "integer", (col) =>
          col.references("test.id").onDelete("cascade").notNull(),
        )
        .addColumn("question_id", "integer", (col) =>
          col.references("question.id").onDelete("cascade").notNull(),
        )
        .execute();
    },
  );

export async function createTopic(db: Kysely<DbSchema>, name: string) {
  try {
    return await db
      .insertInto("topic")
      .values({ name })
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      throw new Error(`A topic with the name "${name}" already exists.`);
    }
    throw error;
  }
}

export async function deleteTopic(
  db: Kysely<DbSchema>,
  id: number,
): Promise<void> {
  await sql`PRAGMA foreign_keys = ON`.execute(db);

  await db.deleteFrom("topic").where("id", "=", id).execute();
}

export interface GenerateTestPayload {
  topic_name: string;
  questions: string[];
}

export async function generateNewTest(
  db: Kysely<DbSchema>,
  payload: GenerateTestPayload,
) {
  return await db.transaction().execute(async (trx) => {
    await sql`PRAGMA foreign_keys = ON`.execute(trx);

    let topic = await trx
      .selectFrom("topic")
      .selectAll()
      .where("name", "=", payload.topic_name)
      .executeTakeFirst();

    if (!topic) {
      topic = await trx
        .insertInto("topic")
        .values({ name: payload.topic_name })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    const test = await trx
      .insertInto("test")
      .values({
        topic_id: topic.id,
        date: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const createdQuestions = [];
    for (const qText of payload.questions) {
      const q = await trx
        .insertInto("question")
        .values({
          topic_id: topic.id,
          question: qText,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      createdQuestions.push({ id: q.id, question: q.question });
    }

    return {
      test_id: test.id,
      topic_id: topic.id,
      questions: createdQuestions,
    };
  });
}

export interface UserAnswerPayload {
  test_id: number;
  answers: {
    question_id: number;
    user_answer: string;
    is_correct: boolean;
  }[];
}

export async function submitTestAnswers(
  db: Kysely<DbSchema>,
  payload: UserAnswerPayload,
) {
  await db.transaction().execute(async (trx) => {
    await sql`PRAGMA foreign_keys = ON`.execute(trx);

    for (const ans of payload.answers) {
      await trx
        .insertInto("test_answer")
        .values({
          test_id: payload.test_id,
          question_id: ans.question_id,
          answer: ans.user_answer,
          correct: (ans.is_correct ? 1 : 0) as unknown as boolean,
        })
        .execute();
    }
  });

  return { success: true };
}

export interface SingleAnswerPayload {
  test_id: number;
  question_id: number;
  user_answer: string;
  is_correct: boolean;
}

export async function submitAnswer(
  db: Kysely<DbSchema>,
  payload: SingleAnswerPayload,
) {
  return await db.transaction().execute(async (trx) => {
    await sql`PRAGMA foreign_keys = ON`.execute(trx);

    // 1. Insert the current single answer row
    await trx
      .insertInto("test_answer")
      .values({
        test_id: payload.test_id,
        question_id: payload.question_id,
        answer: payload.user_answer,
        correct: (payload.is_correct ? 1 : 0) as unknown as boolean,
      })
      .execute();

    // 2. Resolve the topic layout configuration
    const testRecord = await trx
      .selectFrom("test")
      .select("topic_id")
      .where("id", "=", payload.test_id)
      .executeTakeFirst();

    if (!testRecord) {
      throw new Error(`Test ID ${payload.test_id} not found.`);
    }

    const allQuestions = await trx
      .selectFrom("question")
      .select(["id", "question"])
      .where("topic_id", "=", testRecord.topic_id)
      .orderBy("id", "asc")
      .execute();

    const answeredRows = await trx
      .selectFrom("test_answer")
      .select("question_id")
      .where("test_id", "=", payload.test_id)
      .execute();

    const answeredIds = new Set(answeredRows.map((row) => row.question_id));

    // 3. Find if another question remains
    const nextQuestion = allQuestions.find((q) => !answeredIds.has(q.id));

    if (nextQuestion) {
      return {
        test_complete: false,
        next_question: {
          id: nextQuestion.id,
          text: nextQuestion.question,
        },
        score: null, // Quiz ongoing
      };
    }

    // 4. TEST COMPLETE: Calculate the scorecard results right here!
    const gradingSummary = await trx
      .selectFrom("test_answer")
      .select([
        trx.fn.count("id").as("total"),
        // Sum up rows where correct is true (1)
        trx.fn
          .sum(sql`CASE WHEN correct = 1 THEN 1 ELSE 0 END`)
          .as("correct_count"),
      ])
      .where("test_id", "=", payload.test_id)
      .executeTakeFirst();

    const totalQuestions = Number(gradingSummary?.total || allQuestions.length);
    const correctQuestions = Number(gradingSummary?.correct_count || 0);

    return {
      test_complete: true,
      next_question: null,
      score: {
        total: totalQuestions,
        correct: correctQuestions,
        percentage:
          totalQuestions > 0
            ? Math.round((correctQuestions / totalQuestions) * 100)
            : 0,
      },
    };
  });
}
