from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import timedelta
import os
from dotenv import load_dotenv
from api_routes import api
from ai_timetable import TimetableGenerator

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

jwt = JWTManager(app)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# Register API routes
app.register_blueprint(api)

# Database initialization
def init_db():
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('main_admin', 'dept_admin', 'staff')),
            department_id INTEGER,
            staff_role TEXT CHECK (staff_role IN ('assistant_professor', 'professor', 'hod')),
            subjects_selected TEXT,
            subjects_locked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')
    
    # Departments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Subjects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            department_id INTEGER NOT NULL,
            credits INTEGER DEFAULT 3,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')
    
    # Classrooms table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            department_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id)
        )
    ''')
    
    # Timetables table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS timetables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER NOT NULL,
            day TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            subject_id INTEGER NOT NULL,
            staff_id INTEGER NOT NULL,
            classroom_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (staff_id) REFERENCES users (id),
            FOREIGN KEY (classroom_id) REFERENCES classrooms (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate SRM email
        if not data['email'].endswith('@srmist.edu.in'):
            return jsonify({'error': 'Only @srmist.edu.in emails are allowed'}), 400
        
        # Validate role-specific requirements
        if data['role'] in ['dept_admin', 'staff'] and not data.get('department_id'):
            return jsonify({'error': 'Department is required for this role'}), 400
        
        if data['role'] == 'staff' and not data.get('staff_role'):
            return jsonify({'error': 'Staff role is required for staff members'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (data['email'],))
        if cursor.fetchone():
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password
        password_hash = generate_password_hash(data['password'])
        
        # Insert user
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, role, department_id, staff_role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['email'],
            password_hash,
            data['role'],
            data.get('department_id'),
            data.get('staff_role')
        ))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        # Get user data for response
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.role, u.department_id, u.staff_role, 
                   u.subjects_selected, u.subjects_locked, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        ''', (user_id,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if user_data:
            user = {
                'id': str(user_data[0]),
                'name': user_data[1],
                'email': user_data[2],
                'role': user_data[3],
                'department_id': str(user_data[4]) if user_data[4] else None,
                'staff_role': user_data[5],
                'subjects_selected': user_data[6].split(',') if user_data[6] else [],
                'subjects_locked': bool(user_data[7]),
                'department_name': user_data[8]
            }
            
            access_token = create_access_token(identity=str(user_id))
            
            return jsonify({
                'user': user,
                'token': access_token
            }), 201
        
        return jsonify({'error': 'Registration failed'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])      
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Validate SRM email
        if not data['email'].endswith('@srmist.edu.in'):
            return jsonify({'error': 'Only @srmist.edu.in emails are allowed'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        # Get user data
        cursor.execute('''
            SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, 
                   u.staff_role, u.subjects_selected, u.subjects_locked, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = ?
        ''', (data['email'],))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if not user_data or not check_password_hash(user_data[3], data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        user = {
            'id': str(user_data[0]),
            'name': user_data[1],
            'email': user_data[2],
            'role': user_data[4],
            'department_id': str(user_data[5]) if user_data[5] else None,
            'staff_role': user_data[6],
            'subjects_selected': user_data[7].split(',') if user_data[7] else [],
            'subjects_locked': bool(user_data[8]),
            'department_name': user_data[9]
        }
        
        access_token = create_access_token(identity=str(user_data[0]))
        
        return jsonify({
            'user': user,
            'token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Department management routes
@app.route('/api/departments', methods=['GET'])
@jwt_required()
def get_departments():
    try:
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, code FROM departments ORDER BY name')
        departments = cursor.fetchall()
        conn.close()
        
        return jsonify([{
            'id': str(dept[0]),
            'name': dept[1],
            'code': dept[2]
        } for dept in departments]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/departments', methods=['POST'])
@jwt_required()
def create_department():
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('code'):
            return jsonify({'error': 'Name and code are required'}), 400
        
        conn = sqlite3.connect('timetable.db')
        cursor = conn.cursor()
        
        cursor.execute('INSERT INTO departments (name, code) VALUES (?, ?)', 
                      (data['name'], data['code']))
        dept_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': str(dept_id),
            'name': data['name'],
            'code': data['code']
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check route
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'SRM Timetable AI Backend is running'}), 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
