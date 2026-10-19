import { Kysely } from "kysely";
import { type DbSchema } from "./types.ts";

interface TopicWithQuestions {
  name: string;
  questions: {
    question: string;
    correct_answer: string;
  }[];
}

const createTestKnowledge = async (
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

export default createTestKnowledge;
