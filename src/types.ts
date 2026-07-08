export interface Student {
  id: string;
  pvc_id: string;
  full_name: string;
  passport_photo: string; // Base64 data URL
  phone_number: string;
  email_address: string;
  registration_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Staff';
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  admin_name: string;
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  todaysRegistrations: number;
  totalPvcGenerated: number;
}

export interface AssignmentSubmission {
  id: string;
  student_id: string;
  student_name: string;
  pvc_id: string;
  title: string;
  submission_link: string;
  comments?: string;
  score?: number; // Rated out of 100 or customized
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  graded_by?: string;
}

export interface LeaderboardEntry {
  student_id: string;
  pvc_id: string;
  full_name: string;
  passport_photo: string;
  total_score: number;
  submissions_count: number;
  rank: number;
}

