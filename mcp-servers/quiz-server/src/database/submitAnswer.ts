import { Kysely } from "kysely";
import { type DbSchema } from "./types.ts";

const submitAnswer = async (
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

export default submitAnswer;
