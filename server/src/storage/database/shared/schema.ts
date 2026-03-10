import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Lesson Plans table for storing generated lesson plans
export const lessonPlans = pgTable("lesson_plans", {
  id: serial().notNull().primaryKey(),
  teacherName: varchar("teacher_name", { length: 100 }).notNull(),
  grade: varchar("grade", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 50 }).notNull(),
  knowledgePoint: text("knowledge_point").notNull(),
  courseObjective: text("course_objective").notNull(),
  lessonDate: varchar("lesson_date", { length: 20 }).notNull(),
  tieredObjectives: jsonb("tiered_objectives").$type<{
    basic: string;
    core: string;
    challenge: string;
  }>(),
  introOptions: jsonb("intro_options").$type<Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>>(),
  activityOptions: jsonb("activity_options").$type<Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>>(),
  summaryOptions: jsonb("summary_options").$type<Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>>(),
  learningMap: jsonb("learning_map").$type<{
    basic: string;
    core: string;
    challenge: string;
  }>(),
  selectedIntroIds: jsonb("selected_intro_ids").$type<number[]>(),
  selectedActivityIds: jsonb("selected_activity_ids").$type<number[]>(),
  selectedSummaryIds: jsonb("selected_summary_ids").$type<number[]>(),
  fullPlan: text("full_plan"),
  difficulty: integer("difficulty").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

export const insertLessonPlanSchema = createCoercedInsertSchema(lessonPlans).pick({
  teacherName: true,
  grade: true,
  subject: true,
  knowledgePoint: true,
  courseObjective: true,
  lessonDate: true,
  tieredObjectives: true,
  introOptions: true,
  activityOptions: true,
  summaryOptions: true,
  learningMap: true,
  fullPlan: true,
  selectedIntroIds: true,
  selectedActivityIds: true,
  selectedSummaryIds: true,
  difficulty: true,
}).partial({
  selectedIntroIds: true,
  selectedActivityIds: true,
  selectedSummaryIds: true,
});

export type LessonPlan = typeof lessonPlans.$inferSelect;
export type InsertLessonPlan = z.infer<typeof insertLessonPlanSchema>;
