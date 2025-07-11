import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'database.sqlite');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clerk_id TEXT UNIQUE,
      name TEXT NOT NULL,
      employee_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('main_admin', 'department_admin', 'staff')),
      department_id INTEGER,
      programme TEXT,
      type TEXT,
      contact_number TEXT,
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
      description TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
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
      subject_type TEXT DEFAULT 'theory',
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
      room_type TEXT DEFAULT 'lecture',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // Constraints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS constraints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER,
      role TEXT NOT NULL,
      subject_type TEXT NOT NULL,
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
      is_final BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (staff_id) REFERENCES users(id),
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
    )
  `);

  // Create main admin if not exists
  const mainAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('srmtt@srmist.edu.in');
  if (!mainAdmin) {
    const hashedPassword = bcrypt.hashSync('mcs2024', 10);
    const mainAdminId = uuidv4();
    
    db.prepare(`
      INSERT INTO users (id, name, employee_id, email, username, password_hash, role, programme, type, contact_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mainAdminId,
      'Main Administrator',
      'ADMIN001',
      'srmtt@srmist.edu.in',
      'mainadmin',
      hashedPassword,
      'main_admin',
      'Administration',
      'Admin',
      '+91-9999999999'
    );
  }

  console.log('Database initialized successfully');
}

// User management functions
export const userQueries = {
  createUser: db.prepare(`
    INSERT INTO users (id, name, employee_id, email, username, password_hash, role, department_id, programme, type, contact_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByClerkId: db.prepare('SELECT * FROM users WHERE clerk_id = ?'),
  
  updateClerkId: db.prepare('UPDATE users SET clerk_id = ? WHERE id = ?'),
  
  getAllUsers: db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code 
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    ORDER BY u.created_at DESC
  `),
  
  getUsersByDepartment: db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code 
    FROM users u 
    LEFT JOIN departments d ON u.department_id = d.id 
    WHERE u.department_id = ? 
    ORDER BY u.created_at DESC
  `),
};

// Department management functions
export const departmentQueries = {
  createDepartment: db.prepare(`
    INSERT INTO departments (name, code, description, created_by)
    VALUES (?, ?, ?, ?)
  `),
  
  getAllDepartments: db.prepare('SELECT * FROM departments ORDER BY name'),
  getDepartmentById: db.prepare('SELECT * FROM departments WHERE id = ?'),
  getDepartmentByCode: db.prepare('SELECT * FROM departments WHERE code = ?'),
};

// Initialize database on import
initializeDatabase();

export default db;