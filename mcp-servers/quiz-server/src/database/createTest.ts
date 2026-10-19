import { Kysely } from "kysely";
import { type DbSchema } from "./types.ts";

const createTest = async (
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

export default createTest;
