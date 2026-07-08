import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";

// Drizzle SQL Database imports
import { db as sqlDb } from "./src/db/index.ts";
import {
  students as sqlStudents,
  admins as sqlAdmins,
  auditLogs as sqlAuditLogs,
  quizzes as sqlQuizzes,
  submissions as sqlSubmissions,
  settings as sqlSettings,
  notifications as sqlNotifications,
} from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

// Firebase Admin SDK
import { adminAuth } from "./src/lib/firebase-admin.ts";

// ES Module resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper for hashing passwords
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Database Interfaces
interface DBStudent {
  id: string;
  pvc_id: string;
  full_name: string;
  passport_photo: string;
  phone_number: string;
  email_address: string;
  registration_date: string;
  created_at: string;
  updated_at: string;
}

interface DBAdmin {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "Administrator" | "Staff";
  created_at: string;
}

interface DBAuditLog {
  id: string;
  action: string;
  details: string;
  admin_name: string;
  created_at: string;
}

interface DBQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface DBDailyQuiz {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  questions: DBQuizQuestion[];
  answers?: number[];
  score?: number;
  feedback?: string;
  submitted_at?: string;
  created_at: string;
}

interface DBSubmission {
  id: string;
  student_id: string;
  student_name: string;
  pvc_id: string;
  title: string;
  submission_link: string;
  comments?: string;
  score?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  graded_by?: string;
}

interface DBSettings {
  notifyOnAIGrading: boolean;
  activeStudyModule: string;
}

interface DBNotification {
  id: string;
  student_id: string; // "all" for system-wide, or specific student ID
  type: "ai_grading" | "study_prep" | "info";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface DBSchema {
  students: DBStudent[];
  admins: DBAdmin[];
  auditLogs: DBAuditLog[];
  lastPvcIdNumber: number;
  submissions: DBSubmission[];
  quizzes: DBDailyQuiz[];
  settings?: DBSettings;
  notifications?: DBNotification[];
}

// Local Database Fallback Initialization
function initDatabase(): DBSchema {
  let loadedDb: any = null;
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      loadedDb = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse db.json, resetting...", e);
    }
  }

  if (!loadedDb) {
    // Default initial schema
    loadedDb = {
      students: [],
      admins: [
        {
          id: "admin-default",
          name: "Director SL-Techco",
          email: "admin@sltechco.com",
          passwordHash: hashPassword("admin123"),
          role: "Administrator",
          created_at: new Date().toISOString(),
        },
      ],
      auditLogs: [
        {
          id: "log-init",
          action: "System Initialization",
          details: "SL-TECHCO ACADEMY PVC Student ID Management System initialized successfully.",
          admin_name: "System",
          created_at: new Date().toISOString(),
        },
      ],
      lastPvcIdNumber: 0,
      submissions: [],
      quizzes: [],
      settings: {
        notifyOnAIGrading: true,
        activeStudyModule: "Module 1: Introduction to Vibe Coding"
      },
      notifications: [],
    };
  }

  // Ensure fields are defined for backward compatibility
  if (!loadedDb.students) loadedDb.students = [];
  if (!loadedDb.admins) loadedDb.admins = [];
  if (!loadedDb.auditLogs) loadedDb.auditLogs = [];
  if (loadedDb.lastPvcIdNumber === undefined) loadedDb.lastPvcIdNumber = 0;
  if (!loadedDb.submissions) loadedDb.submissions = [];
  if (!loadedDb.quizzes) loadedDb.quizzes = [];
  if (!loadedDb.settings) {
    loadedDb.settings = {
      notifyOnAIGrading: true,
      activeStudyModule: "Module 1: Introduction to Vibe Coding"
    };
  }
  if (!loadedDb.notifications) loadedDb.notifications = [];

  // Atomic local write
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(loadedDb, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Local database save failed:", error);
  }

  return loadedDb;
}

// Synchronize Cloud SQL tables with local/in-memory state
async function loadFromCloudSQL(): Promise<DBSchema> {
  try {
    console.log("[Cloud SQL] Loading database state...");
    const [
      studentsList,
      adminsList,
      auditLogsList,
      quizzesList,
      submissionsList,
      settingsList,
      notificationsList,
    ] = await Promise.all([
      sqlDb.select().from(sqlStudents),
      sqlDb.select().from(sqlAdmins),
      sqlDb.select().from(sqlAuditLogs),
      sqlDb.select().from(sqlQuizzes),
      sqlDb.select().from(sqlSubmissions),
      sqlDb.select().from(sqlSettings),
      sqlDb.select().from(sqlNotifications),
    ]);

    // If there is no data in Postgres (e.g. fresh database), seed it from db.json
    if (studentsList.length === 0 && adminsList.length === 0) {
      console.log("[Cloud SQL] Database is empty. Seeding from local db.json fallback...");
      const localDb = initDatabase();
      await seedCloudSQL(localDb);
      return localDb;
    }

    console.log(`[Cloud SQL] Successfully loaded records: 
      - Students: ${studentsList.length}
      - Admins: ${adminsList.length}
      - Audit Logs: ${auditLogsList.length}
      - Quizzes: ${quizzesList.length}
      - Submissions: ${submissionsList.length}
      - Notifications: ${notificationsList.length}`);

    // Determine the next starting PVC sequential counter
    const lastPvcIdNumber = studentsList.length > 0 
      ? Math.max(...studentsList.map(s => {
          const num = parseInt(s.pvc_id.replace("PVC-", ""), 10);
          return isNaN(num) ? 0 : num;
        }))
      : 0;

    return {
      students: studentsList,
      admins: adminsList.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        passwordHash: a.passwordHash,
        role: a.role as "Administrator" | "Staff",
        created_at: a.created_at
      })),
      auditLogs: auditLogsList,
      lastPvcIdNumber,
      submissions: submissionsList.map(s => ({
        id: s.id,
        student_id: s.student_id,
        student_name: s.student_name,
        pvc_id: s.pvc_id,
        title: s.title,
        submission_link: s.submission_link,
        comments: s.comments || undefined,
        score: s.score !== null ? s.score : undefined,
        feedback: s.feedback || undefined,
        submitted_at: s.submitted_at,
        graded_at: s.graded_at || undefined,
        graded_by: s.graded_by || undefined,
      })),
      quizzes: quizzesList.map(q => ({
        id: q.id,
        student_id: q.student_id,
        date: q.date,
        questions: q.questions as DBQuizQuestion[],
        answers: q.answers as number[] || undefined,
        score: q.score !== null ? q.score : undefined,
        feedback: q.feedback || undefined,
        submitted_at: q.submitted_at || undefined,
        created_at: q.created_at,
      })),
      settings: settingsList[0] 
        ? {
            notifyOnAIGrading: settingsList[0].notifyOnAIGrading,
            activeStudyModule: settingsList[0].activeStudyModule,
          }
        : {
            notifyOnAIGrading: true,
            activeStudyModule: "Module 1: Introduction to Vibe Coding",
          },
      notifications: notificationsList.map(n => ({
        id: n.id,
        student_id: n.student_id,
        type: n.type as "ai_grading" | "study_prep" | "info",
        title: n.title,
        message: n.message,
        read: n.read,
        created_at: n.created_at,
      })),
    };
  } catch (error) {
    console.error("[Cloud SQL] Load failed, falling back to local file:", error);
    return initDatabase();
  }
}

async function seedCloudSQL(localDb: DBSchema) {
  try {
    console.log("[Cloud SQL] Seeding Postgres tables...");
    
    if (localDb.admins && localDb.admins.length > 0) {
      await sqlDb.insert(sqlAdmins).values(localDb.admins).onConflictDoNothing();
    }
    
    if (localDb.students && localDb.students.length > 0) {
      await sqlDb.insert(sqlStudents).values(localDb.students).onConflictDoNothing();
    }

    if (localDb.auditLogs && localDb.auditLogs.length > 0) {
      await sqlDb.insert(sqlAuditLogs).values(localDb.auditLogs).onConflictDoNothing();
    }

    if (localDb.submissions && localDb.submissions.length > 0) {
      const sanitizedSubmissions = localDb.submissions.map(s => ({
        id: s.id,
        student_id: s.student_id,
        student_name: s.student_name,
        pvc_id: s.pvc_id,
        title: s.title,
        submission_link: s.submission_link,
        comments: s.comments || null,
        score: s.score !== undefined ? s.score : null,
        feedback: s.feedback || null,
        submitted_at: s.submitted_at,
        graded_at: s.graded_at || null,
        graded_by: s.graded_by || null,
      }));
      await sqlDb.insert(sqlSubmissions).values(sanitizedSubmissions).onConflictDoNothing();
    }

    if (localDb.quizzes && localDb.quizzes.length > 0) {
      const sanitizedQuizzes = localDb.quizzes.map(q => ({
        id: q.id,
        student_id: q.student_id,
        date: q.date,
        questions: q.questions,
        answers: q.answers || null,
        score: q.score !== undefined ? q.score : null,
        feedback: q.feedback || null,
        submitted_at: q.submitted_at || null,
        created_at: q.created_at,
      }));
      await sqlDb.insert(sqlQuizzes).values(sanitizedQuizzes).onConflictDoNothing();
    }

    const currentSettings = localDb.settings || {
      notifyOnAIGrading: true,
      activeStudyModule: "Module 1: Introduction to Vibe Coding",
    };
    await sqlDb.insert(sqlSettings).values({
      id: "global_settings",
      notifyOnAIGrading: currentSettings.notifyOnAIGrading,
      activeStudyModule: currentSettings.activeStudyModule,
    }).onConflictDoNothing();

    if (localDb.notifications && localDb.notifications.length > 0) {
      await sqlDb.insert(sqlNotifications).values(localDb.notifications).onConflictDoNothing();
    }

    console.log("[Cloud SQL] Seeding complete successfully.");
  } catch (error) {
    console.error("[Cloud SQL] Seeding failed:", error);
  }
}

async function saveToCloudSQL(data: DBSchema) {
  try {
    console.log("[Cloud SQL] Background synchronization started...");

    // Upsert admins
    if (data.admins && data.admins.length > 0) {
      for (const admin of data.admins) {
        await sqlDb.insert(sqlAdmins).values(admin).onConflictDoUpdate({
          target: sqlAdmins.id,
          set: {
            name: admin.name,
            email: admin.email,
            passwordHash: admin.passwordHash,
            role: admin.role,
          }
        });
      }
    }

    // Upsert students
    if (data.students && data.students.length > 0) {
      for (const student of data.students) {
        await sqlDb.insert(sqlStudents).values(student).onConflictDoUpdate({
          target: sqlStudents.id,
          set: {
            pvc_id: student.pvc_id,
            full_name: student.full_name,
            passport_photo: student.passport_photo,
            phone_number: student.phone_number,
            email_address: student.email_address,
            registration_date: student.registration_date,
            updated_at: student.updated_at,
          }
        });
      }
    }

    // Upsert audit logs
    if (data.auditLogs && data.auditLogs.length > 0) {
      for (const log of data.auditLogs) {
        await sqlDb.insert(sqlAuditLogs).values(log).onConflictDoNothing();
      }
    }

    // Upsert submissions
    if (data.submissions && data.submissions.length > 0) {
      for (const s of data.submissions) {
        await sqlDb.insert(sqlSubmissions).values({
          id: s.id,
          student_id: s.student_id,
          student_name: s.student_name,
          pvc_id: s.pvc_id,
          title: s.title,
          submission_link: s.submission_link,
          comments: s.comments || null,
          score: s.score !== undefined ? s.score : null,
          feedback: s.feedback || null,
          submitted_at: s.submitted_at,
          graded_at: s.graded_at || null,
          graded_by: s.graded_by || null,
        }).onConflictDoUpdate({
          target: sqlSubmissions.id,
          set: {
            score: s.score !== undefined ? s.score : null,
            feedback: s.feedback || null,
            graded_at: s.graded_at || null,
            graded_by: s.graded_by || null,
          }
        });
      }
    }

    // Upsert quizzes
    if (data.quizzes && data.quizzes.length > 0) {
      for (const q of data.quizzes) {
        await sqlDb.insert(sqlQuizzes).values({
          id: q.id,
          student_id: q.student_id,
          date: q.date,
          questions: q.questions,
          answers: q.answers || null,
          score: q.score !== undefined ? q.score : null,
          feedback: q.feedback || null,
          submitted_at: q.submitted_at || null,
          created_at: q.created_at,
        }).onConflictDoUpdate({
          target: sqlQuizzes.id,
          set: {
            questions: q.questions,
            answers: q.answers || null,
            score: q.score !== undefined ? q.score : null,
            feedback: q.feedback || null,
            submitted_at: q.submitted_at || null,
          }
        });
      }
    }

    // Upsert settings
    if (data.settings) {
      await sqlDb.insert(sqlSettings).values({
        id: "global_settings",
        notifyOnAIGrading: data.settings.notifyOnAIGrading,
        activeStudyModule: data.settings.activeStudyModule,
      }).onConflictDoUpdate({
        target: sqlSettings.id,
        set: {
          notifyOnAIGrading: data.settings.notifyOnAIGrading,
          activeStudyModule: data.settings.activeStudyModule,
        }
      });
    }

    // Upsert notifications
    if (data.notifications && data.notifications.length > 0) {
      for (const n of data.notifications) {
        await sqlDb.insert(sqlNotifications).values({
          id: n.id,
          student_id: n.student_id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          created_at: n.created_at,
        }).onConflictDoUpdate({
          target: sqlNotifications.id,
          set: {
            read: n.read,
          }
        });
      }
    }

    console.log("[Cloud SQL] Sync complete successfully.");
  } catch (err) {
    console.error("[Cloud SQL] Background save failed:", err);
  }
}

// --- WEBSOCKET CLIENT REGISTRY & BROADCAST HELPERS ---
interface ConnectedClient {
  ws: WebSocket;
  type: "admin" | "student" | "unknown";
  studentId?: string;
}

const connectedClients = new Set<ConnectedClient>();

function broadcastToAdmins(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  for (const client of connectedClients) {
    if (client.type === "admin" && client.ws.readyState === WebSocket.OPEN) {
      try { client.ws.send(payload); } catch (_) {}
    }
  }
}

function broadcastToStudents(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  for (const client of connectedClients) {
    if (client.type === "student" && client.ws.readyState === WebSocket.OPEN) {
      try { client.ws.send(payload); } catch (_) {}
    }
  }
}

function sendToStudent(studentId: string, event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  for (const client of connectedClients) {
    if (client.type === "student" && client.studentId === studentId && client.ws.readyState === WebSocket.OPEN) {
      try { client.ws.send(payload); } catch (_) {}
    }
  }
}

function broadcastToAll(event: string, data: any) {
  const payload = JSON.stringify({ event, data });
  for (const client of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try { client.ws.send(payload); } catch (_) {}
    }
  }
}

let wss: WebSocketServer | null = null;

function setupWebSocketServer(server: any) {
  wss = new WebSocketServer({ server });
  
  wss.on("connection", (ws: WebSocket) => {
    const client: ConnectedClient = {
      ws,
      type: "unknown",
    };
    connectedClients.add(client);
    console.log("[WS] New client connected. Total clients:", connectedClients.size);

    // Send connection ACK
    ws.send(JSON.stringify({ event: "connected", data: { message: "Connected to SL-TECHCO Real-time Server" } }));

    // Send periodic ping to maintain connection (Vite dev server or proxy timeout protection)
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.ping(); } catch (_) {}
      }
    }, 30000);

    ws.on("message", (messageStr: string) => {
      try {
        const msg = JSON.parse(messageStr.toString());
        if (msg.event === "register") {
          if (msg.data.role === "admin") {
            client.type = "admin";
            console.log("[WS] Client registered as ADMIN");
            ws.send(JSON.stringify({ event: "registered", data: { status: "success", role: "admin" } }));
          } else if (msg.data.role === "student" && msg.data.studentId) {
            client.type = "student";
            client.studentId = msg.data.studentId;
            console.log(`[WS] Client registered as STUDENT (ID: ${msg.data.studentId})`);
            ws.send(JSON.stringify({ event: "registered", data: { status: "success", role: "student" } }));
          }
        } else if (msg.event === "ping") {
          ws.send(JSON.stringify({ event: "pong" }));
        }
      } catch (err) {
        console.error("[WS] Message parsing error:", err);
      }
    });

    ws.on("close", () => {
      clearInterval(pingInterval);
      connectedClients.delete(client);
      console.log("[WS] Client disconnected. Total remaining clients:", connectedClients.size);
    });

    ws.on("error", (err) => {
      clearInterval(pingInterval);
      connectedClients.delete(client);
      console.error("[WS] Client error:", err);
    });
  });

  console.log("[WS] WebSocket Server initialized alongside Express");
}

// Atomic local & Cloud SQL database write
async function saveDatabase(data: DBSchema): Promise<void> {
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error("Local database save failed (expected in read-only environments like Vercel):", error);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  }

  // Await Cloud SQL write to ensure persistence on Vercel
  try {
    await saveToCloudSQL(data);
  } catch (err) {
    console.error("[Cloud SQL] Save failed:", err);
  }

  // Broadcast real-time updates to connected clients
  try {
    const totalStudents = data.students.length;
    const todayStr = new Date().toISOString().substring(0, 10);
    const todaysRegistrations = data.students.filter((s) => s.registration_date === todayStr).length;
    const totalPvcGenerated = data.lastPvcIdNumber;

    broadcastToAdmins("stats_updated", {
      totalStudents,
      todaysRegistrations,
      totalPvcGenerated,
    });

    broadcastToAdmins("recent_students_updated", data.students.slice(-5).reverse());
    broadcastToAdmins("audit_logs_updated", data.auditLogs.slice(0, 100));

    // Also update student notification badges / assignments
    broadcastToAll("db_synced", { timestamp: new Date().toISOString() });
  } catch (wsErr) {
    console.error("[WS] Failed to broadcast state update:", wsErr);
  }
}

// Initial default state (will be replaced by Cloud SQL load in startServer)
let db = initDatabase();

// In-memory mutex lock for PVC ID generation to guarantee thread-safe increment
let isDbLocked = false;
async function acquireLock(): Promise<void> {

  while (isDbLocked) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  isDbLocked = true;
}
function releaseLock(): void {
  isDbLocked = false;
}

// AI helpers using lazy initialization
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function evaluateSubmissionWithAI(submission: DBSubmission): Promise<{ score: number; feedback: string }> {
  const client = getAIClient();
  
  let textbook = "";
  try {
    textbook = fs.readFileSync(path.join(process.cwd(), "textbook_ocr.txt"), "utf-8");
  } catch (e) {
    console.error("Could not read textbook_ocr.txt for grading:", e);
  }

  const prompt = `
Textbook Material:
${textbook}

---
Student Submission:
- Title: ${submission.title}
- Link: ${submission.submission_link}
- Student Comments: ${submission.comments || "No comments provided."}

Please analyze this student submission and grade it.
First, identify which Module/Project in the textbook this submission belongs to based on the Title ("${submission.title}") and comments.
Then, evaluate whether the student's comments and submission details satisfy the module requirements outlined in the textbook.
Provide a professional, encouraging but rigorous grade out of 100 and detailed feedback explaining what they did well, what could be improved, and how it aligns with the textbook material.
`;

  const response = await client.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are the official AI Assignment Evaluator for SL-TECHCO ACADEMY. You grade student code submissions and comments based on the official textbook. Be encouraging but rigorous.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: {
            type: Type.INTEGER,
            description: "A numerical score from 0 to 100."
          },
          feedback: {
            type: Type.STRING,
            description: "Detailed, constructive feedback referring to the textbook modules and requirements."
          }
        },
        required: ["score", "feedback"]
      }
    }
  });

  const text = response.text || "{}";
  const result = JSON.parse(text.trim());
  return {
    score: typeof result.score === "number" ? Math.min(100, Math.max(0, result.score)) : 70,
    feedback: result.feedback || "Submission received and catalogued."
  };
}

async function generateQuizWithAI(date: string, studentName: string, targetModule?: string): Promise<DBQuizQuestion[]> {
  const client = getAIClient();
  
  let textbook = "";
  try {
    textbook = fs.readFileSync(path.join(process.cwd(), "textbook_ocr.txt"), "utf-8");
  } catch (e) {
    console.error("Could not read textbook_ocr.txt for quiz generation:", e);
  }

  const modules = [
    "Module 1: Introduction to Vibe Coding",
    "Module 2: AI Tools for Vibe Coding",
    "Module 3: Prompt Engineering for Developers",
    "Module 4: Web Development with AI",
    "Module 5: No-Code and Low-Code Development",
    "Module 6: UI/UX Design with AI",
    "Module 7: Mobile App Development with AI",
    "Module 8: Databases and Backend Development",
    "Module 9: Automation with AI",
    "Module 10: AI Content Creation & Digital Products",
    "Module 11: SaaS Development with AI",
    "Module 12: Deployment and Launching",
    "Module 13: Freelancing & Client Acquisition",
    "Module 14: Advanced AI Agents & Professional Vibe Coding"
  ];

  const shuffled = [...modules].sort(() => 0.5 - Math.random());
  const focusModules = targetModule || shuffled.slice(0, 3).join(", ");

  const prompt = `
Textbook Material:
${textbook}

---
You are generating a daily quiz for student: "${studentName}" on date: "${date}".
To make the questions unique and focused, please select 10 multiple-choice questions testing concepts, theories, and details from the textbook.
The primary focus of today's quiz should be on these modules: [ ${focusModules} ].

Instructions:
1. Generate exactly 10 high-quality multiple choice questions.
2. Each question must have exactly 4 distinct options.
3. Define the correct answer index as an integer from 0 to 3.
4. Include a clear, helpful explanation of why the correct option is right, referring back to details in the textbook.
5. Ensure questions are highly professional and reflect real content from the PVC-AID textbook.
`;

  const response = await client.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are the official AI Quiz Generator for SL-TECHCO ACADEMY. You create high-quality multiple choice questions based on the course textbook.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "The quiz question text." },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 4 options for the answer."
            },
            correctAnswerIndex: {
              type: Type.INTEGER,
              description: "The 0-based index of the correct option (0, 1, 2, or 3)."
            },
            explanation: {
              type: Type.STRING,
              description: "Detailed, helpful explanation of the correct answer."
            }
          },
          required: ["question", "options", "correctAnswerIndex", "explanation"]
        }
      }
    }
  });

  const text = response.text || "[]";
  const result = JSON.parse(text.trim());
  if (!Array.isArray(result) || result.length === 0) {
    throw new Error("AI returned invalid quiz structure");
  }

  return result.slice(0, 10).map((q: any) => {
    let opts = Array.isArray(q.options) ? q.options : ["Option A", "Option B", "Option C", "Option D"];
    while (opts.length < 4) opts.push(`Option ${opts.length + 1}`);
    opts = opts.slice(0, 4);

    let idx = typeof q.correctAnswerIndex === "number" ? q.correctAnswerIndex : 0;
    if (idx < 0 || idx > 3) idx = 0;

    return {
      question: q.question || "What is a core benefit of Vibe Coding?",
      options: opts,
      correctAnswerIndex: idx,
      explanation: q.explanation || "Refer to the textbook modules for the correct context."
    };
  });
}

const app = express();

// Middleware for body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database Auto-loading State Manager
let dbPromise: Promise<DBSchema> | null = null;
let isDbLoaded = false;

function ensureDbLoaded(): Promise<DBSchema> {
  if (!dbPromise) {
    dbPromise = loadFromCloudSQL().then((loadedDb) => {
      db = loadedDb;
      isDbLoaded = true;
      return loadedDb;
    });
  }
  return dbPromise;
}

// Middleware to ensure DB is loaded before handling any API request
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) {
    try {
      await ensureDbLoaded();
    } catch (err) {
      console.error("[SL-TECHCO] DB load failed in middleware, using local fallback:", err);
    }
  }
  next();
});

// Helper to add audit logs
async function logActivity(action: string, details: string, adminName: string) {
  db.auditLogs.unshift({
    id: "log-" + crypto.randomUUID().substring(0, 8),
    action,
    details,
    admin_name: adminName,
    created_at: new Date().toISOString(),
  });
  // Keep last 1000 logs
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  await saveDatabase(db);
}

  // --- API ROUTES ---

  // Auth Middleware
  function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(411).json({ error: "Unauthorized access: Token missing" });
      return;
    }
    const token = authHeader.replace("Bearer ", "");
    // Simplistic token check: token is base64 of email
    try {
      const email = Buffer.from(token, "base64").toString("utf-8");
      const admin = db.admins.find((a) => a.email === email);
      if (admin) {
        (req as any).admin = admin;
        next();
      } else {
        res.status(411).json({ error: "Unauthorized access: Invalid administrator session" });
      }
    } catch (_) {
      res.status(411).json({ error: "Unauthorized access: Invalid token format" });
    }
  }

  // Student Login Endpoint
  app.post("/api/auth/student-login", (req, res) => {
    const { email, credential } = req.body;
    if (!email || !credential) {
      res.status(400).json({ error: "Email address and PVC ID / Phone Number are required" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCred = credential.trim().toLowerCase();

    const student = db.students.find(
      (s) =>
        s.email_address.toLowerCase() === trimmedEmail &&
        (s.pvc_id.toLowerCase() === trimmedCred || s.phone_number.toLowerCase() === trimmedCred)
    );

    if (!student) {
      res.status(401).json({ error: "No matching student found. Please verify your email and PVC ID / Phone number." });
      return;
    }

    // Simplistic token for student: "student:" + base64 of student.id
    const token = "student:" + Buffer.from(student.id).toString("base64");

    logActivity(
      "Student Self Login",
      `Student ${student.full_name} (${student.pvc_id}) logged in by themselves to view their ID Card.`,
      "Student"
    );

    res.json({
      token,
      student,
    });
  });

  // Get logged-in Student profile
  app.get("/api/auth/student-me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(411).json({ error: "Unauthorized access: Token missing" });
      return;
    }
    const token = authHeader.replace("Bearer ", "");
    if (!token.startsWith("student:")) {
      res.status(411).json({ error: "Unauthorized access: Invalid student session" });
      return;
    }

    try {
      const studentIdBase64 = token.replace("student:", "");
      const studentId = Buffer.from(studentIdBase64, "base64").toString("utf-8");
      const student = db.students.find((s) => s.id === studentId);
      if (student) {
        res.json({ student });
      } else {
        res.status(404).json({ error: "Student profile not found" });
      }
    } catch (_) {
      res.status(411).json({ error: "Unauthorized access: Invalid student token format" });
    }
  });

  // Helper to resolve student from authorization header
  function getStudentFromRequest(req: express.Request): DBStudent | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.replace("Bearer ", "");
    if (!token.startsWith("student:")) return null;
    try {
      const studentIdBase64 = token.replace("student:", "");
      const studentId = Buffer.from(studentIdBase64, "base64").toString("utf-8");
      return db.students.find((s) => s.id === studentId) || null;
    } catch (_) {
      return null;
    }
  }

  // Submit Assignment (Student)
  app.post("/api/submissions", async (req, res) => {
    const student = getStudentFromRequest(req);
    if (!student) {
      res.status(411).json({ error: "Unauthorized: Invalid student session" });
      return;
    }

    const { title, submission_link, comments } = req.body;
    if (!title || !submission_link) {
      res.status(400).json({ error: "Assignment Title and Submission Link are required" });
      return;
    }

    const newSubmission: DBSubmission = {
      id: "sub-" + crypto.randomUUID().substring(0, 8),
      student_id: student.id,
      student_name: student.full_name,
      pvc_id: student.pvc_id,
      title: title.trim(),
      submission_link: submission_link.trim(),
      comments: comments ? comments.trim() : "",
      submitted_at: new Date().toISOString(),
    };

    // Trigger AI Grading
    try {
      const evaluation = await evaluateSubmissionWithAI(newSubmission);
      newSubmission.score = evaluation.score;
      newSubmission.feedback = evaluation.feedback;
      newSubmission.graded_at = new Date().toISOString();
      newSubmission.graded_by = "AI Evaluator";

      // Automated notification trigger
      if (db.settings && db.settings.notifyOnAIGrading) {
        const newNotif: DBNotification = {
          id: "notif-" + crypto.randomUUID().substring(0, 8),
          student_id: student.id,
          type: "ai_grading",
          title: "Assignment Graded by AI Evaluator",
          message: `Your project "${newSubmission.title}" has been graded by the AI. Score: ${newSubmission.score}/100. Feedback: ${newSubmission.feedback}`,
          read: false,
          created_at: new Date().toISOString()
        };
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift(newNotif);
      }
    } catch (err: any) {
      console.error("AI Auto-grading failed, fallback to manual reviewer:", err);
      newSubmission.feedback = "Automatic AI evaluation was temporarily unavailable. An administrator will grade your submission.";
    }

    db.submissions.unshift(newSubmission);
    saveDatabase(db);

    logActivity(
      "Assignment Submission",
      `Student ${student.full_name} (${student.pvc_id}) submitted assignment "${newSubmission.title}". AI Auto-grade: ${newSubmission.score !== undefined ? newSubmission.score + "/100" : "Pending"}`,
      student.full_name
    );

    res.status(201).json(newSubmission);
  });

  // Get Submissions (Admin or Student)
  app.get("/api/submissions", (req, res) => {
    // Check if student first
    const student = getStudentFromRequest(req);
    if (student) {
      const studentSubmissions = db.submissions.filter((s) => s.student_id === student.id);
      res.json({ submissions: studentSubmissions });
      return;
    }

    // Check if admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(411).json({ error: "Unauthorized: Token missing" });
      return;
    }
    const token = authHeader.replace("Bearer ", "");
    try {
      const email = Buffer.from(token, "base64").toString("utf-8");
      const admin = db.admins.find((a) => a.email === email);
      if (!admin) {
        res.status(411).json({ error: "Unauthorized: Invalid session" });
        return;
      }

      // If admin, return all submissions
      res.json({ submissions: db.submissions });
    } catch (_) {
      res.status(411).json({ error: "Unauthorized: Invalid token format" });
    }
  });

  // Grade/Score Submission (Admin)
  app.post("/api/submissions/:id/grade", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(411).json({ error: "Unauthorized: Token missing" });
      return;
    }
    const token = authHeader.replace("Bearer ", "");
    let admin: DBAdmin | undefined;
    try {
      const email = Buffer.from(token, "base64").toString("utf-8");
      admin = db.admins.find((a) => a.email === email);
    } catch (_) {}

    if (!admin) {
      res.status(411).json({ error: "Unauthorized: Administrator session required" });
      return;
    }

    const { id } = req.params;
    const { score, feedback } = req.body;

    if (score === undefined || score === null || isNaN(parseInt(score, 10))) {
      res.status(400).json({ error: "A valid numerical score is required" });
      return;
    }

    const submissionIndex = db.submissions.findIndex((s) => s.id === id);
    if (submissionIndex === -1) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const submission = db.submissions[submissionIndex];
    submission.score = Math.min(100, Math.max(0, parseInt(score, 10)));
    submission.feedback = feedback ? feedback.trim() : "";
    submission.graded_at = new Date().toISOString();
    submission.graded_by = admin.name;

    saveDatabase(db);

    logActivity(
      "Assignment Graded",
      `Administrator ${admin.name} scored submission "${submission.title}" for Student ${submission.student_name} (${submission.pvc_id}): ${submission.score}/100`,
      admin.name
    );

    res.json(submission);
  });

  // Get Leaderboard (Students & Admins)
  app.get("/api/leaderboard", (req, res) => {
    // Generate leaderboard entries
    const studentStats: { [key: string]: { total_score: number; submissions_count: number } } = {};

    // Initialize all students to 0
    db.students.forEach((student) => {
      studentStats[student.id] = {
        total_score: 0,
        submissions_count: 0,
      };
    });

    // Populate from submissions
    db.submissions.forEach((sub) => {
      if (sub.score !== undefined && sub.score !== null) {
        if (!studentStats[sub.student_id]) {
          studentStats[sub.student_id] = { total_score: 0, submissions_count: 0 };
        }
        studentStats[sub.student_id].total_score += sub.score;
        studentStats[sub.student_id].submissions_count += 1;
      }
    });

    // Populate from quizzes
    if (db.quizzes) {
      db.quizzes.forEach((quiz) => {
        if (quiz.score !== undefined && quiz.score !== null) {
          if (!studentStats[quiz.student_id]) {
            studentStats[quiz.student_id] = { total_score: 0, submissions_count: 0 };
          }
          studentStats[quiz.student_id].total_score += quiz.score;
        }
      });
    }

    const entries = db.students.map((student) => {
      const stats = studentStats[student.id] || { total_score: 0, submissions_count: 0 };
      return {
        student_id: student.id,
        pvc_id: student.pvc_id,
        full_name: student.full_name,
        passport_photo: student.passport_photo,
        total_score: stats.total_score,
        submissions_count: stats.submissions_count,
      };
    });

    // Sort by total score descending, then by pvc_id ascending (consistent ranking)
    entries.sort((a, b) => {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return a.pvc_id.localeCompare(b.pvc_id);
    });

    // Add rank (standard ranking, where identical scores can share rank or simple sequence. Let's do standard ranking where identical scores share rank)
    let currentRank = 1;
    let previousScore = -1;
    const rankedEntries = entries.map((entry, idx) => {
      if (idx === 0) {
        previousScore = entry.total_score;
      } else if (entry.total_score < previousScore) {
        currentRank = idx + 1;
        previousScore = entry.total_score;
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });

    res.json({ leaderboard: rankedEntries });
  });

  // GET Settings (Admins and Students)
  app.get("/api/settings", (req, res) => {
    res.json({ settings: db.settings });
  });

  // POST Update Settings (Admin only)
  app.post("/api/settings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(411).json({ error: "Unauthorized: Token missing" });
      return;
    }
    const token = authHeader.replace("Bearer ", "");
    let admin: DBAdmin | undefined;
    try {
      const email = Buffer.from(token, "base64").toString("utf-8");
      admin = db.admins.find((a) => a.email === email);
    } catch (_) {}

    if (!admin) {
      res.status(411).json({ error: "Unauthorized: Administrator session required" });
      return;
    }

    const { notifyOnAIGrading, activeStudyModule } = req.body;
    if (db.settings) {
      const oldModule = db.settings.activeStudyModule;
      if (notifyOnAIGrading !== undefined) db.settings.notifyOnAIGrading = notifyOnAIGrading;
      if (activeStudyModule !== undefined) db.settings.activeStudyModule = activeStudyModule;
      
      saveDatabase(db);

      // If active study module changed, push study prep notifications to ALL students
      if (activeStudyModule && activeStudyModule !== oldModule) {
        const notificationMessage = `Study Prep Alert: Today's study target has been updated to "${activeStudyModule}". Review this module in your textbook to prepare for today's Daily AI Quiz!`;
        if (!db.notifications) db.notifications = [];
        
        db.students.forEach((std) => {
          const newNotif: DBNotification = {
            id: "notif-" + crypto.randomUUID().substring(0, 8),
            student_id: std.id,
            type: "study_prep",
            title: `Study Preparation: ${activeStudyModule.split(":")[0]}`,
            message: notificationMessage,
            read: false,
            created_at: new Date().toISOString()
          };
          db.notifications.unshift(newNotif);
        });
        saveDatabase(db);

        logActivity(
          "Study Target Updated",
          `Administrator ${admin.name} updated the active study focus to "${activeStudyModule}". All candidates notified.`,
          admin.name
        );
      } else {
        logActivity(
          "Settings Updated",
          `Administrator ${admin.name} updated AI-grading / study coordinator settings.`,
          admin.name
        );
      }
    }
    res.json({ settings: db.settings });
  });

  // GET Notifications for student
  app.get("/api/notifications", (req, res) => {
    const student = getStudentFromRequest(req);
    if (!student) {
      res.status(411).json({ error: "Unauthorized: Student session required" });
      return;
    }

    if (!db.notifications) db.notifications = [];
    const studentNotifications = db.notifications.filter(
      (n) => n.student_id === student.id || n.student_id === "all"
    );

    res.json({ notifications: studentNotifications });
  });

  // POST Mark Student Notifications as read
  app.post("/api/notifications/read", (req, res) => {
    const student = getStudentFromRequest(req);
    if (!student) {
      res.status(411).json({ error: "Unauthorized: Student session required" });
      return;
    }

    if (db.notifications) {
      db.notifications.forEach((n) => {
        if (n.student_id === student.id || n.student_id === "all") {
          n.read = true;
        }
      });
      saveDatabase(db);
    }

    res.json({ success: true });
  });

  // GET Today's Quiz for student
  app.get("/api/quiz/today", (req, res) => {
    const student = getStudentFromRequest(req);
    if (!student) {
      res.status(411).json({ error: "Unauthorized: Invalid student session" });
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const foundQuiz = db.quizzes.find(
      (q) => q.student_id === student.id && q.date === todayStr
    );

    if (!foundQuiz) {
      res.status(404).json({ error: "No quiz generated for today yet." });
      return;
    }

    res.json({ quiz: foundQuiz });
  });

  // POST Generate Today's Quiz for student using Gemini AI
  app.post("/api/quiz/generate", async (req, res) => {
    const student = getStudentFromRequest(req);
    if (!student) {
      res.status(411).json({ error: "Unauthorized: Invalid student session" });
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const existingQuiz = db.quizzes.find(
      (q) => q.student_id === student.id && q.date === todayStr
    );

    if (existingQuiz) {
      res.json({ quiz: existingQuiz });
      return;
    }

    try {
      const activeModule = db.settings?.activeStudyModule || "Module 1: Introduction to Vibe Coding";
      const questions = await generateQuizWithAI(todayStr, student.full_name, activeModule);
      
      const newQuiz: DBDailyQuiz = {
        id: "quiz-" + crypto.randomUUID().substring(0, 8),
        student_id: student.id,
        date: todayStr,
        questions: questions,
        created_at: new Date().toISOString(),
      };

      db.quizzes.unshift(newQuiz);
      saveDatabase(db);

      logActivity(
        "Quiz Generation",
        `Generated daily textbook assessment for Student ${student.full_name} (${student.pvc_id})`,
        student.full_name
      );

      res.status(201).json({ quiz: newQuiz });
    } catch (err: any) {
      console.error("AI Quiz generation failed:", err);
      res.status(500).json({ error: `AI Assessment synthesis failed: ${err.message}` });
    }
  });

  // POST Submit Today's Quiz Answers
  app.post("/api/quiz/submit", (req, res) => {
    const student = getStudentFromRequest(req);
    if (!student) {
      res.status(411).json({ error: "Unauthorized: Invalid student session" });
      return;
    }

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== 10) {
      res.status(400).json({ error: "Invalid answers array. Must contain exactly 10 choices." });
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const quizIndex = db.quizzes.findIndex(
      (q) => q.student_id === student.id && q.date === todayStr
    );

    if (quizIndex === -1) {
      res.status(404).json({ error: "No quiz found to submit for today." });
      return;
    }

    const quiz = db.quizzes[quizIndex];
    if (quiz.answers) {
      res.status(400).json({ error: "Today's quiz has already been submitted." });
      return;
    }

    // Evaluate score
    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    
    quiz.answers = answers;
    quiz.score = score;
    quiz.submitted_at = new Date().toISOString();
    quiz.feedback = `Academic review complete. You answered ${correctCount} of 10 questions correctly. Secure points added directly to your cryptographic PVC Academy Leaderboard Profile. Keep up the high standard of excellence!`;

    saveDatabase(db);

    logActivity(
      "Quiz Submitted",
      `Student ${student.full_name} (${student.pvc_id}) completed today's AI Assessment. Score: ${score}% (${correctCount}/10 correct)`,
      student.full_name
    );

    res.json({ quiz });
  });

  // Public Student Registration
  app.post("/api/auth/student-register", async (req, res) => {
    const { full_name, passport_photo, phone_number, email_address } = req.body;

    if (!full_name || !passport_photo || !phone_number || !email_address) {
      res.status(400).json({ error: "All fields are required (Full Name, Passport Photo, Phone, Email)" });
      return;
    }

    await acquireLock();
    try {
      const existingEmail = db.students.find(
        (s) => s.email_address.toLowerCase() === email_address.toLowerCase()
      );
      if (existingEmail) {
        res.status(400).json({ error: `A student with email ${email_address} is already registered.` });
        return;
      }

      const nextIdNum = db.lastPvcIdNumber + 1;
      const pvcId = "PVC" + nextIdNum.toString().padStart(3, "0");

      const now = new Date().toISOString();
      const newStudent: DBStudent = {
        id: "std-" + crypto.randomUUID().substring(0, 8),
        pvc_id: pvcId,
        full_name: full_name.trim(),
        passport_photo,
        phone_number: phone_number.trim(),
        email_address: email_address.trim().toLowerCase(),
        registration_date: now.substring(0, 10),
        created_at: now,
        updated_at: now,
      };

      db.students.push(newStudent);
      db.lastPvcIdNumber = nextIdNum;
      saveDatabase(db);

      logActivity(
        "Student Public Register",
        `Student ${newStudent.full_name} registered themselves online and was assigned ID ${newStudent.pvc_id}.`,
        "Self Registration"
      );

      res.status(201).json(newStudent);
    } finally {
      releaseLock();
    }
  });

  // Public Admin Registration (Maximum 5 Admins total)
  app.post("/api/auth/admin-register", (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" });
      return;
    }

    if (db.admins.length >= 5) {
      res.status(400).json({ error: "Admin registration blocked: System limit reached. A maximum of 5 administrators are allowed." });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const existingAdmin = db.admins.find((a) => a.email.toLowerCase() === emailLower);
    if (existingAdmin) {
      res.status(400).json({ error: "An administrator with this email already exists." });
      return;
    }

    const newAdmin: DBAdmin = {
      id: "admin-" + crypto.randomUUID().substring(0, 8),
      name: name.trim(),
      email: emailLower,
      passwordHash: hashPassword(password),
      role: role || "Administrator",
      created_at: new Date().toISOString(),
    };

    db.admins.push(newAdmin);
    saveDatabase(db);

    logActivity(
      "Admin Registered",
      `New administrator ${newAdmin.name} (${newAdmin.email}) registered. Active admins count: ${db.admins.length}/5`,
      "Self Registration"
    );

    res.status(201).json({
      success: true,
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      }
    });
  });

  // Login Endpoint
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const admin = db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!admin || admin.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Simplistic token: Base64 of email (suitable for container development dev-mode)
    const token = Buffer.from(admin.email).toString("base64");
    
    logActivity("Admin Login", `Administrator ${admin.name} (${admin.email}) logged in.`, admin.name);

    res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  });

  // Get current Admin profile
  app.get("/api/auth/me", authenticate, (req, res) => {
    const admin = (req as any).admin;
    res.json({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const todaysCount = db.students.filter((s) => s.created_at.startsWith(todayStr)).length;

    res.json({
      totalStudents: db.students.length,
      todaysRegistrations: todaysCount,
      totalPvcGenerated: db.lastPvcIdNumber,
    });
  });

  // Search/List Students
  app.get("/api/students", (req, res) => {
    const query = (req.query.q as string || "").toLowerCase().trim();
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = parseInt(req.query.limit as string || "10", 10);

    let filtered = [...db.students];

    if (query) {
      filtered = filtered.filter((s) => {
        return (
          s.pvc_id.toLowerCase().includes(query) ||
          s.full_name.toLowerCase().includes(query) ||
          s.phone_number.includes(query) ||
          s.email_address.toLowerCase().includes(query)
        );
      });
    }

    // Sort by registration date/created_at descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      students: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // View specific student
  app.get("/api/students/:id", (req, res) => {
    const student = db.students.find((s) => s.id === req.params.id || s.pvc_id === req.params.id);
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json(student);
  });

  // Public/Verification route for QR scan
  app.get("/api/verify/:pvcId", (req, res) => {
    const student = db.students.find((s) => s.pvc_id.toUpperCase() === req.params.pvcId.toUpperCase());
    if (!student) {
      res.status(404).json({ error: "Invalid Student ID." });
      return;
    }
    res.json({
      verified: true,
      student: {
        pvc_id: student.pvc_id,
        full_name: student.full_name,
        passport_photo: student.passport_photo,
        phone_number: student.phone_number,
        email_address: student.email_address,
        registration_date: student.registration_date,
        registration_status: "ACTIVE - VERIFIED STUDENT",
      },
    });
  });

  // Add/Register Student
  app.post("/api/students", authenticate, async (req, res) => {
    const { full_name, passport_photo, phone_number, email_address } = req.body;
    const admin = (req as any).admin;

    // Validation
    if (!full_name || !passport_photo || !phone_number || !email_address) {
      res.status(400).json({ error: "All fields are required (Full Name, Passport Photo, Phone, Email)" });
      return;
    }

    await acquireLock();
    try {
      // Check duplicate email
      const existingEmail = db.students.find(
        (s) => s.email_address.toLowerCase() === email_address.toLowerCase()
      );
      if (existingEmail) {
        res.status(400).json({ error: `A student with email ${email_address} is already registered.` });
        return;
      }

      // Generate atomic, safe PVC ID
      const nextIdNum = db.lastPvcIdNumber + 1;
      const pvcId = "PVC" + nextIdNum.toString().padStart(3, "0");

      const now = new Date().toISOString();
      const newStudent: DBStudent = {
        id: "std-" + crypto.randomUUID().substring(0, 8),
        pvc_id: pvcId,
        full_name: full_name.trim(),
        passport_photo,
        phone_number: phone_number.trim(),
        email_address: email_address.trim().toLowerCase(),
        registration_date: now.substring(0, 10),
        created_at: now,
        updated_at: now,
      };

      db.students.push(newStudent);
      db.lastPvcIdNumber = nextIdNum;
      saveDatabase(db);

      logActivity(
        "Register Student",
        `Registered student ${newStudent.full_name} assigned ID ${newStudent.pvc_id}.`,
        admin.name
      );

      res.status(201).json(newStudent);
    } finally {
      releaseLock();
    }
  });

  // Edit/Update Student
  app.put("/api/students/:id", authenticate, (req, res) => {
    const { full_name, passport_photo, phone_number, email_address } = req.body;
    const admin = (req as any).admin;

    const index = db.students.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const student = db.students[index];

    // Check duplicate email on other students
    if (email_address && email_address.toLowerCase() !== student.email_address.toLowerCase()) {
      const emailExists = db.students.some(
        (s) => s.id !== student.id && s.email_address.toLowerCase() === email_address.toLowerCase()
      );
      if (emailExists) {
        res.status(400).json({ error: `Email ${email_address} is already used by another student.` });
        return;
      }
    }

    const now = new Date().toISOString();
    const updatedStudent: DBStudent = {
      ...student,
      full_name: full_name ? full_name.trim() : student.full_name,
      passport_photo: passport_photo || student.passport_photo,
      phone_number: phone_number ? phone_number.trim() : student.phone_number,
      email_address: email_address ? email_address.trim().toLowerCase() : student.email_address,
      updated_at: now,
    };

    db.students[index] = updatedStudent;
    saveDatabase(db);

    logActivity(
      "Update Student",
      `Updated student ${updatedStudent.full_name} (${updatedStudent.pvc_id}).`,
      admin.name
    );

    res.json(updatedStudent);
  });

  // Delete Student
  app.delete("/api/students/:id", authenticate, (req, res) => {
    const admin = (req as any).admin;
    const student = db.students.find((s) => s.id === req.params.id);

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    db.students = db.students.filter((s) => s.id !== req.params.id);
    saveDatabase(db);

    logActivity(
      "Delete Student",
      `Deleted student record for ${student.full_name} (${student.pvc_id}). ID numbering continues permanently.`,
      admin.name
    );

    res.json({ success: true, message: "Student record deleted successfully" });
  });

  // Import Students (Bulk CSV / Excel JSON)
  app.post("/api/students/import", authenticate, async (req, res) => {
    const { studentsList } = req.body;
    const admin = (req as any).admin;

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      res.status(400).json({ error: "Invalid import payload: List of students is required" });
      return;
    }

    await acquireLock();
    try {
      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const item of studentsList) {
        const { full_name, phone_number, email_address, passport_photo } = item;

        if (!full_name || !phone_number || !email_address) {
          skippedCount++;
          errors.push(`Row missing required fields: ${JSON.stringify(item)}`);
          continue;
        }

        const email = email_address.trim().toLowerCase();

        // Check if already exists
        const exists = db.students.some((s) => s.email_address.toLowerCase() === email);
        if (exists) {
          skippedCount++;
          errors.push(`Student with email ${email} already exists`);
          continue;
        }

        const nextIdNum = db.lastPvcIdNumber + 1;
        const pvcId = "PVC" + nextIdNum.toString().padStart(3, "0");
        const now = new Date().toISOString();

        const newStudent: DBStudent = {
          id: "std-" + crypto.randomUUID().substring(0, 8),
          pvc_id: pvcId,
          full_name: full_name.trim(),
          passport_photo: passport_photo || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='55%' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle'>No Photo</text></svg>",
          phone_number: phone_number.trim(),
          email_address: email,
          registration_date: now.substring(0, 10),
          created_at: now,
          updated_at: now,
        };

        db.students.push(newStudent);
        db.lastPvcIdNumber = nextIdNum;
        importedCount++;
      }

      saveDatabase(db);

      logActivity(
        "Bulk Import Students",
        `Successfully imported ${importedCount} student records. Skipped ${skippedCount}.`,
        admin.name
      );

      res.json({
        success: true,
        importedCount,
        skippedCount,
        errors,
      });
    } finally {
      releaseLock();
    }
  });

  // Get Audit Logs
  app.get("/api/audit-logs", authenticate, (req, res) => {
    res.json({ auditLogs: db.auditLogs });
  });

  // --- VITE DEV / PRODUCTION FLOW ---
  // Export app for Vercel Serverless Function support
  export default app;

  async function initServer() {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    if (!process.env.VERCEL) {
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`[SL-TECHCO Server] Running on http://localhost:${PORT}`);
      });
      setupWebSocketServer(server);
    }
  }

  initServer().catch((err) => {
    console.error("Failed to start SL-TECHCO server:", err);
  });
