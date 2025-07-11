import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'main_admin' | 'department_admin' | 'staff';
  department_id?: number;
  staff_role?: 'assistant_professor' | 'professor' | 'hod';
  subjects_selected?: string;
  subjects_locked: boolean;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  credits: number;
  department_id: number;
  subject_type: 'theory' | 'lab';
  created_at: string;
}

export interface Classroom {
  id: number;
  name: string;
  capacity: number;
  department_id: number;
  room_type: 'lecture' | 'lab' | 'seminar';
  created_at: string;
}

export interface Constraint {
  id: number;
  department_id?: number;
  role: 'assistant_professor' | 'professor' | 'hod';
  subject_type: 'theory' | 'lab' | 'both';
  max_subjects: number;
  max_hours: number;
  created_by: string;
  created_at: string;
}

export interface Timetable {
  id: number;
  department_id: number;
  day: string;
  time_slot: string;
  subject_id: number;
  staff_id: string;
  classroom_id: number;
  version: number;
  created_at: string;
}

export default db;