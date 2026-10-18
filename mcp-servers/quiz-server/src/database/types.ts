import type { Generated } from "kysely";

interface Topic {
  id: Generated<number>;
  name: string;
}

interface Test {
  id: Generated<number>;
  topic_id: number;
  date: string;
  number_questions: number;
  grade?: number;
}

interface TestAnswer {
  id: Generated<number>;
  test_id: number;
  question_id: number;
  answer: string;
  correct?: boolean;
}

interface Question {
  id: Generated<number>;
  topic_id: number;
  question: string;
  correct_answer: string;
}

export interface DbSchema {
  topic: Topic;
  test: Test;
  test_answer: TestAnswer;
  question: Question;
}
