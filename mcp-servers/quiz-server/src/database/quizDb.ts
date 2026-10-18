import { Kysely } from "kysely";
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
        .createTable("question")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("question", "text", (col) => col.notNull())
        .addColumn("topic_id", "integer", (col) =>
          col.references("topic.id").onDelete("cascade").notNull(),
        )
        .addColumn("correct_answer", "text", (col) => col.notNull())
        .execute();

      await schema
        .createTable("test")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("date", "text", (col) => col.notNull())
        .addColumn("number_questions", "integer", (col) => col.notNull()) // Added missing column
        .addColumn("topic_id", "integer", (col) =>
          col.references("topic.id").onDelete("cascade").notNull(),
        )
        .addColumn("grade", "integer")
        .execute();

      await schema
        .createTable("test_answer")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn(
          "test_id",
          "integer",
          (col) => col.references("test.id").onDelete("cascade").notNull(), // Fixed relation logic
        )
        .addColumn("question_id", "integer", (col) =>
          col.references("question.id").onDelete("cascade").notNull(),
        )
        .addColumn("answer", "text", (col) => col.notNull())
        .addColumn("correct", "boolean")
        .execute();
    },
  );

interface TopicWithQuestions {
  name: string;
  questions: {
    question: string;
    correct_answer: string;
  }[];
}

export const createTestKnowledge = async (
  db: Kysely<DbSchema>,
  data: TopicWithQuestions,
) => {
  const topicInsertResult = await db
    .insertInto("topic")
    .values({ name: data.name })
    .executeTakeFirstOrThrow();

  const topicId = Number(topicInsertResult.insertId);

  if (!topicId) {
    throw new Error("Failed to insert topic.");
  }

  await db
    .insertInto("question")
    .values(
      data.questions.map((q) => ({
        question: q.question,
        correct_answer: q.correct_answer,
        topic_id: topicId,
      })),
    )
    .execute();
};

export const createTest = async (
  db: Kysely<DbSchema>,
  topicName: string,
  numberOfQuestions: number,
) => {
  const topic = await db
    .selectFrom("topic")
    .where("name", "=", topicName)
    .select("id")
    .executeTakeFirstOrThrow();

  const topicId = topic.id;

  const questionCountResult = await db
    .selectFrom("question")
    .where("topic_id", "=", topicId)
    .select(db.fn.count("id").as("count"))
    .executeTakeFirstOrThrow();

  const questionCount = Number(questionCountResult.count);

  if (questionCount < 1) {
    throw new Error("Not enough questions available for the specified topic.");
  }

  const randomOffset = Math.floor(Math.random() * questionCount);
  const question = await db
    .selectFrom("question")
    .where("topic_id", "=", topicId)
    .offset(randomOffset)
    .limit(1)
    .select(["id", "question"])
    .executeTakeFirst();

  if (!question) {
    throw new Error("Failed to fetch a random question.");
  }

  const testInsertResult = await db
    .insertInto("test")
    .values({
      topic_id: topicId,
      date: new Date().toISOString(),
      number_questions: numberOfQuestions,
    })
    .executeTakeFirstOrThrow();

  const testId = Number(testInsertResult.insertId);

  if (!testId) {
    throw new Error("Failed to insert test.");
  }

  return {
    question: question.question,
    questionId: question.id,
    testId,
  };
};

export const submitAnswer = async (
  db: Kysely<DbSchema>,
  params: {
    testId: number;
    questionId: number;
    answer: string;
  },
) => {
  const { testId, questionId, answer } = params;

  await db
    .insertInto("test_answer")
    .values({
      test_id: testId,
      question_id: questionId,
      answer: answer,
    })
    .executeTakeFirstOrThrow();

  const test = await db
    .selectFrom("test")
    .where("id", "=", testId)
    .select(["number_questions", "topic_id"])
    .executeTakeFirstOrThrow();

  const answersCountResult = await db
    .selectFrom("test_answer")
    .where("test_id", "=", testId)
    .select(db.fn.count("id").as("count"))
    .executeTakeFirstOrThrow();

  const currentAnswerCount = Number(answersCountResult.count);

  if (currentAnswerCount >= test.number_questions) {
    const evaluationPayload = await db
      .selectFrom("test_answer")
      .innerJoin("question", "question.id", "test_answer.question_id")
      .where("test_answer.test_id", "=", testId)
      .select([
        "test_answer.id as answer_id",
        "question.question",
        "question.correct_answer as reference_answer",
        "test_answer.answer as user_answer",
      ])
      .execute();

    return {
      status: "completed" as const,
      evaluationPayload,
    };
  }

  const answeredQuestions = await db
    .selectFrom("test_answer")
    .where("test_id", "=", testId)
    .select("question_id")
    .execute();

  const excludedIds = answeredQuestions.map((a) => a.question_id);

  const remainingCountResult = await db
    .selectFrom("question")
    .where("topic_id", "=", test.topic_id)
    .where("id", "not in", excludedIds)
    .select(db.fn.count("id").as("count"))
    .executeTakeFirstOrThrow();

  const remainingCount = Number(remainingCountResult.count);

  if (remainingCount === 0) {
    throw new Error("No remaining unanswered questions left for this topic.");
  }

  const randomOffset = Math.floor(Math.random() * remainingCount);
  const nextQuestion = await db
    .selectFrom("question")
    .where("topic_id", "=", test.topic_id)
    .where("id", "not in", excludedIds)
    .offset(randomOffset)
    .limit(1)
    .select(["id", "question"])
    .executeTakeFirstOrThrow();

  return {
    status: "next_question" as const,
    nextQuestion: {
      id: nextQuestion.id,
      question: nextQuestion.question,
    },
  };
};

interface AnswerFeedback {
  answerId: number;
  correct: boolean;
}

export const saveTestGrade = async (
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
