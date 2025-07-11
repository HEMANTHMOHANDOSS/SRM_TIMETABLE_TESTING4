import { db } from './database';

export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('main_admin', 'department_admin', 'staff')),
      department_id INTEGER,
      staff_role TEXT CHECK (staff_role IN ('assistant_professor', 'professor', 'hod')),
      subjects_selected TEXT,
      subjects_locked BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Subjects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      department_id INTEGER NOT NULL,
      subject_type TEXT NOT NULL CHECK (subject_type IN ('theory', 'lab')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // Classrooms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      department_id INTEGER NOT NULL,
      room_type TEXT NOT NULL CHECK (room_type IN ('lecture', 'lab', 'seminar')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // Constraints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS constraints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER,
      role TEXT NOT NULL CHECK (role IN ('assistant_professor', 'professor', 'hod')),
      subject_type TEXT NOT NULL CHECK (subject_type IN ('theory', 'lab', 'both')),
      max_subjects INTEGER NOT NULL DEFAULT 1,
      max_hours INTEGER NOT NULL DEFAULT 8,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Timetables table
  db.exec(`
    CREATE TABLE IF NOT EXISTS timetables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      subject_id INTEGER NOT NULL,
      staff_id TEXT NOT NULL,
      classroom_id INTEGER NOT NULL,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (staff_id) REFERENCES users(id),
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
    CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
    CREATE INDEX IF NOT EXISTS idx_classrooms_department ON classrooms(department_id);
    CREATE INDEX IF NOT EXISTS idx_constraints_department ON constraints(department_id);
    CREATE INDEX IF NOT EXISTS idx_timetables_department ON timetables(department_id);
    CREATE INDEX IF NOT EXISTS idx_timetables_version ON timetables(version);
  `);

  console.log('Database initialized successfully');
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase();
}