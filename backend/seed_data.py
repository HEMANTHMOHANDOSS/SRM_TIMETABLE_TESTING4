
import sqlite3
from werkzeug.security import generate_password_hash

def seed_database():
    """Seed database with sample data"""
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()
    
    # Sample departments
    departments = [
        ('Computer Science Engineering', 'CSE'),
        ('Electronics & Communication Engineering', 'ECE'),
        ('Mechanical Engineering', 'MECH'),
        ('Civil Engineering', 'CIVIL'),
        ('Information Technology', 'IT')
    ]
    
    for dept in departments:
        cursor.execute('INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)', dept)
    
    # Sample subjects for CSE department (assuming dept_id = 1)
    cse_subjects = [
        ('Data Structures', 'CS101', 1),
        ('Algorithms', 'CS102', 1),
        ('Database Management Systems', 'CS201', 1),
        ('Computer Networks', 'CS202', 1),
        ('Operating Systems', 'CS301', 1),
        ('Software Engineering', 'CS302', 1),
        ('Machine Learning', 'CS401', 1),
        ('Artificial Intelligence', 'CS402', 1)
    ]
    
    for subject in cse_subjects:
        cursor.execute('INSERT OR IGNORE INTO subjects (name, code, department_id) VALUES (?, ?, ?)', subject)
    
    # Sample classrooms for CSE department
    cse_classrooms = [
        ('Room A101', 60, 1),
        ('Room A102', 50, 1),
        ('Lab B101', 30, 1),
        ('Lab B102', 30, 1),
        ('Seminar Hall', 100, 1)
    ]
    
    for classroom in cse_classrooms:
        cursor.execute('INSERT OR IGNORE INTO classrooms (name, capacity, department_id) VALUES (?, ?, ?)', classroom)
    
    # Sample users
    users = [
        # Main Admin
        ('Main Admin', 'admin@srmist.edu.in', generate_password_hash('admin123'), 'main_admin', None, None, None, False),
        # Department Admin for CSE
        ('CSE Admin', 'cse.admin@srmist.edu.in', generate_password_hash('cseadmin123'), 'dept_admin', 1, None, None, False),
        # Staff members for CSE
        ('Dr. John Smith', 'john.smith@srmist.edu.in', generate_password_hash('staff123'), 'staff', 1, 'professor', '1,2', True),
        ('Prof. Jane Doe', 'jane.doe@srmist.edu.in', generate_password_hash('staff123'), 'staff', 1, 'hod', '3', True),
        ('Dr. Mike Johnson', 'mike.johnson@srmist.edu.in', generate_password_hash('staff123'), 'staff', 1, 'assistant_professor', '4,5', True),
        ('Dr. Sarah Wilson', 'sarah.wilson@srmist.edu.in', generate_password_hash('staff123'), 'staff', 1, 'assistant_professor', '6,7', True)
    ]
    
    for user in users:
        cursor.execute('''
            INSERT OR IGNORE INTO users 
            (name, email, password_hash, role, department_id, staff_role, subjects_selected, subjects_locked) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', user)
    
    conn.commit()
    conn.close()
    print("Database seeded successfully!")

if __name__ == '__main__':
    seed_database()
