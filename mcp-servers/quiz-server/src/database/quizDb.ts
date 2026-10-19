import type { DbSchema } from "./types.ts";
import { db, type DecoratedSchemaBuilder } from "@mcp-packages/database";

const quizDb = async (database: string = "/data/quiz.sqlite") =>
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

export default quizDb;
