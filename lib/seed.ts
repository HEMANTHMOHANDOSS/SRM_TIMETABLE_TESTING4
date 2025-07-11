import { db } from './database';
import { initializeDatabase } from './init-db';

export function seedDatabase() {
  initializeDatabase();

  // Insert sample departments
  const insertDepartment = db.prepare(`
    INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)
  `);

  const departments = [
    ['Computer Science Engineering', 'CSE'],
    ['Electronics & Communication Engineering', 'ECE'],
    ['Mechanical Engineering', 'MECH'],
    ['Civil Engineering', 'CIVIL'],
    ['Information Technology', 'IT'],
  ];

  departments.forEach(([name, code]) => {
    insertDepartment.run(name, code);
  });

  // Get department IDs
  const getDepartments = db.prepare('SELECT id, code FROM departments');
  const deptMap = new Map();
  getDepartments.all().forEach((dept: any) => {
    deptMap.set(dept.code, dept.id);
  });

  // Insert sample subjects for CSE
  const insertSubject = db.prepare(`
    INSERT OR IGNORE INTO subjects (name, code, credits, department_id, subject_type) 
    VALUES (?, ?, ?, ?, ?)
  `);

  const cseSubjects = [
    ['Data Structures and Algorithms', 'CS301', 4, 'theory'],
    ['Database Management Systems', 'CS302', 3, 'theory'],
    ['Operating Systems', 'CS303', 3, 'theory'],
    ['Computer Networks', 'CS304', 3, 'theory'],
    ['Software Engineering', 'CS305', 3, 'theory'],
    ['Data Structures Lab', 'CS301L', 2, 'lab'],
    ['Database Lab', 'CS302L', 2, 'lab'],
    ['Networks Lab', 'CS304L', 2, 'lab'],
  ];

  if (deptMap.has('CSE')) {
    cseSubjects.forEach(([name, code, credits, type]) => {
      insertSubject.run(name, code, credits, deptMap.get('CSE'), type);
    });
  }

  // Insert sample classrooms for CSE
  const insertClassroom = db.prepare(`
    INSERT OR IGNORE INTO classrooms (name, capacity, department_id, room_type) 
    VALUES (?, ?, ?, ?)
  `);

  const cseClassrooms = [
    ['Room A101', 60, 'lecture'],
    ['Room A102', 60, 'lecture'],
    ['Room A103', 40, 'seminar'],
    ['Lab B101', 30, 'lab'],
    ['Lab B102', 30, 'lab'],
    ['Lab B103', 25, 'lab'],
  ];

  if (deptMap.has('CSE')) {
    cseClassrooms.forEach(([name, capacity, type]) => {
      insertClassroom.run(name, capacity, deptMap.get('CSE'), type);
    });
  }

  // Insert default constraints
  const insertConstraint = db.prepare(`
    INSERT OR IGNORE INTO constraints (department_id, role, subject_type, max_subjects, max_hours, created_by) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const defaultConstraints = [
    [null, 'assistant_professor', 'theory', 2, 12, 'system'],
    [null, 'assistant_professor', 'lab', 1, 6, 'system'],
    [null, 'professor', 'theory', 3, 15, 'system'],
    [null, 'professor', 'lab', 2, 8, 'system'],
    [null, 'hod', 'theory', 1, 6, 'system'],
    [null, 'hod', 'lab', 1, 4, 'system'],
  ];

  defaultConstraints.forEach(([deptId, role, subjectType, maxSubjects, maxHours, createdBy]) => {
    insertConstraint.run(deptId, role, subjectType, maxSubjects, maxHours, createdBy);
  });

  console.log('Database seeded successfully');
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}