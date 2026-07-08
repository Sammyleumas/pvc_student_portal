import { pgTable, text, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: text("id").primaryKey(),
  pvc_id: text("pvc_id").notNull().unique(),
  full_name: text("full_name").notNull(),
  passport_photo: text("passport_photo").notNull(),
  phone_number: text("phone_number").notNull(),
  email_address: text("email_address").notNull(),
  registration_date: text("registration_date").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const admins = pgTable("admins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // "Administrator" | "Staff"
  created_at: text("created_at").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  admin_name: text("admin_name").notNull(),
  created_at: text("created_at").notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: text("id").primaryKey(),
  student_id: text("student_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  questions: jsonb("questions").notNull(), // JSON array of DBQuizQuestion
  answers: jsonb("answers"), // JSON array of numbers
  score: integer("score"),
  feedback: text("feedback"),
  submitted_at: text("submitted_at"),
  created_at: text("created_at").notNull(),
});

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  student_id: text("student_id").notNull(),
  student_name: text("student_name").notNull(),
  pvc_id: text("pvc_id").notNull(),
  title: text("title").notNull(),
  submission_link: text("submission_link").notNull(),
  comments: text("comments"),
  score: integer("score"),
  feedback: text("feedback"),
  submitted_at: text("submitted_at").notNull(),
  graded_at: text("graded_at"),
  graded_by: text("graded_by"),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey(), // We can use a single key e.g. "global_settings"
  notifyOnAIGrading: boolean("notify_on_ai_grading").notNull().default(true),
  activeStudyModule: text("active_study_module").notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  student_id: text("student_id").notNull(), // "all" or specific student id
  type: text("type").notNull(), // "ai_grading" | "study_prep" | "info"
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  created_at: text("created_at").notNull(),
});
