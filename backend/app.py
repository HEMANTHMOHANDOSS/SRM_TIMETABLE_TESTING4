from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime
import requests
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Database path
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database.sqlite')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def verify_clerk_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix
            token = token.replace('Bearer ', '')
            
            # In production, verify with Clerk's API
            # For now, we'll skip verification and extract user info from request
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401
    
    return decorated_function

def get_user_from_token():
    # In a real implementation, decode the Clerk JWT token
    # For now, return a mock user based on the request
    return {
        'id': 'user_123',
        'role': 'staff',
        'department_id': 1
    }

# Users API
@app.route('/api/users', methods=['POST'])
@verify_clerk_token
def create_user():
    data = request.get_json()
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO users 
            (id, email, name, role, department_id, staff_role, subjects_selected, subjects_locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['email'],
            data['name'],
            data['role'],
            data.get('department_id'),
            data.get('staff_role'),
            None,
            False
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Departments API
@app.route('/api/departments', methods=['GET'])
@verify_clerk_token
def get_departments():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM departments ORDER BY name')
        departments = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(departments)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/departments', methods=['POST'])
@verify_clerk_token
def create_department():
    data = request.get_json()
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO departments (name, code)
            VALUES (?, ?)
        ''', (data['name'], data['code']))
        
        department_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': department_id,
            'name': data['name'],
            'code': data['code']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Subjects API
@app.route('/api/subjects', methods=['GET'])
@verify_clerk_token
def get_subjects():
    try:
        user = get_user_from_token()
        department_id = request.args.get('department_id', user.get('department_id'))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if department_id:
            cursor.execute('SELECT * FROM subjects WHERE department_id = ? ORDER BY name', (department_id,))
        else:
            cursor.execute('SELECT * FROM subjects ORDER BY name')
            
        subjects = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(subjects)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subjects', methods=['POST'])
@verify_clerk_token
def create_subject():
    data = request.get_json()
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO subjects (name, code, credits, department_id, subject_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data['code'],
            data.get('credits', 3),
            data['department_id'],
            data.get('subject_type', 'theory')
        ))
        
        subject_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': subject_id,
            'name': data['name'],
            'code': data['code'],
            'credits': data.get('credits', 3),
            'department_id': data['department_id'],
            'subject_type': data.get('subject_type', 'theory')
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Classrooms API
@app.route('/api/classrooms', methods=['GET'])
@verify_clerk_token
def get_classrooms():
    try:
        user = get_user_from_token()
        department_id = request.args.get('department_id', user.get('department_id'))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if department_id:
            cursor.execute('SELECT * FROM classrooms WHERE department_id = ? ORDER BY name', (department_id,))
        else:
            cursor.execute('SELECT * FROM classrooms ORDER BY name')
            
        classrooms = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(classrooms)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/classrooms', methods=['POST'])
@verify_clerk_token
def create_classroom():
    data = request.get_json()
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO classrooms (name, capacity, department_id, room_type)
            VALUES (?, ?, ?, ?)
        ''', (
            data['name'],
            data['capacity'],
            data['department_id'],
            data.get('room_type', 'lecture')
        ))
        
        classroom_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': classroom_id,
            'name': data['name'],
            'capacity': data['capacity'],
            'department_id': data['department_id'],
            'room_type': data.get('room_type', 'lecture')
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Constraints API
@app.route('/api/constraints', methods=['GET'])
@verify_clerk_token
def get_constraints():
    try:
        user = get_user_from_token()
        department_id = request.args.get('department_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if department_id:
            cursor.execute('''
                SELECT c.*, d.name as department_name, d.code as department_code
                FROM constraints c
                LEFT JOIN departments d ON c.department_id = d.id
                WHERE c.department_id = ? OR c.department_id IS NULL
                ORDER BY c.created_at DESC
            ''', (department_id,))
        else:
            cursor.execute('''
                SELECT c.*, d.name as department_name, d.code as department_code
                FROM constraints c
                LEFT JOIN departments d ON c.department_id = d.id
                ORDER BY c.created_at DESC
            ''')
            
        constraints = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(constraints)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/constraints', methods=['POST'])
@verify_clerk_token
def create_constraint():
    data = request.get_json()
    
    try:
        user = get_user_from_token()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO constraints (department_id, role, subject_type, max_subjects, max_hours, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data.get('department_id'),
            data['role'],
            data['subject_type'],
            data['max_subjects'],
            data['max_hours'],
            user['id']
        ))
        
        constraint_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': constraint_id,
            'department_id': data.get('department_id'),
            'role': data['role'],
            'subject_type': data['subject_type'],
            'max_subjects': data['max_subjects'],
            'max_hours': data['max_hours'],
            'created_by': user['id']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/constraints/<int:constraint_id>', methods=['DELETE'])
@verify_clerk_token
def delete_constraint(constraint_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM constraints WHERE id = ?', (constraint_id,))
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Constraint not found'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Constraint deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Staff API
@app.route('/api/staff/me', methods=['GET'])
@verify_clerk_token
def get_staff_profile():
    try:
        user = get_user_from_token()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user['id'],))
        staff = cursor.fetchone()
        
        if not staff:
            return jsonify({'error': 'Staff not found'}), 404
        
        conn.close()
        return jsonify(dict(staff))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/staff/subjects', methods=['POST'])
@verify_clerk_token
def select_subjects():
    data = request.get_json()
    
    try:
        user = get_user_from_token()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if already locked
        cursor.execute('SELECT subjects_locked FROM users WHERE id = ?', (user['id'],))
        result = cursor.fetchone()
        
        if result and result['subjects_locked']:
            return jsonify({'error': 'Subjects already locked'}), 400
        
        # Update subjects selection
        subjects_json = json.dumps(data['subject_ids'])
        cursor.execute('''
            UPDATE users 
            SET subjects_selected = ?, subjects_locked = 1
            WHERE id = ?
        ''', (subjects_json, user['id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Subjects selected and locked successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Timetable API
@app.route('/api/timetable/generate', methods=['POST'])
@verify_clerk_token
def generate_timetable():
    data = request.get_json()
    
    try:
        department_id = data['department_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch department data
        cursor.execute('SELECT * FROM departments WHERE id = ?', (department_id,))
        department = dict(cursor.fetchone())
        
        # Fetch subjects
        cursor.execute('SELECT * FROM subjects WHERE department_id = ?', (department_id,))
        subjects = [dict(row) for row in cursor.fetchall()]
        
        # Fetch staff with selected subjects
        cursor.execute('''
            SELECT * FROM users 
            WHERE department_id = ? AND role = 'staff' AND subjects_locked = 1
        ''', (department_id,))
        staff = [dict(row) for row in cursor.fetchall()]
        
        # Fetch classrooms
        cursor.execute('SELECT * FROM classrooms WHERE department_id = ?', (department_id,))
        classrooms = [dict(row) for row in cursor.fetchall()]
        
        # Fetch constraints
        cursor.execute('''
            SELECT * FROM constraints 
            WHERE department_id = ? OR department_id IS NULL
        ''', (department_id,))
        constraints = [dict(row) for row in cursor.fetchall()]
        
        # Generate timetable using AI (simplified version)
        timetable = generate_simple_timetable(subjects, staff, classrooms, constraints)
        
        # Save timetable
        save_timetable(department_id, timetable)
        
        conn.close()
        
        return jsonify({
            'success': True,
            'department': department['name'],
            'timetable': timetable,
            'generated_at': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_simple_timetable(subjects, staff, classrooms, constraints):
    """Simple rule-based timetable generation"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    time_slots = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', 
                  '14:00-15:00', '15:00-16:00', '16:00-17:00']
    
    timetable = []
    used_slots = set()
    staff_workload = {s['id']: 0 for s in staff}
    
    for subject in subjects:
        # Find available staff for this subject
        available_staff = []
        for s in staff:
            if s['subjects_selected']:
                selected_subjects = json.loads(s['subjects_selected'])
                if subject['id'] in selected_subjects:
                    available_staff.append(s)
        
        if not available_staff:
            continue
        
        # Calculate classes needed based on credits
        classes_needed = max(subject['credits'], 1)
        
        for i in range(classes_needed):
            assigned = False
            
            for day in days:
                if assigned:
                    break
                    
                for time_slot in time_slots:
                    # Find staff with least workload
                    selected_staff = min(available_staff, 
                                       key=lambda s: staff_workload[s['id']])
                    
                    # Check staff availability
                    staff_slot_key = f"{selected_staff['id']}-{day}-{time_slot}"
                    if staff_slot_key in used_slots:
                        continue
                    
                    # Find suitable classroom
                    suitable_classrooms = [c for c in classrooms 
                                         if f"{c['id']}-{day}-{time_slot}" not in used_slots]
                    
                    if not suitable_classrooms:
                        continue
                    
                    selected_classroom = suitable_classrooms[0]
                    
                    # Assign the slot
                    timetable.append({
                        'day': day,
                        'time_slot': time_slot,
                        'subject_id': subject['id'],
                        'subject_name': subject['name'],
                        'subject_code': subject['code'],
                        'staff_id': selected_staff['id'],
                        'staff_name': selected_staff['name'],
                        'classroom_id': selected_classroom['id'],
                        'classroom_name': selected_classroom['name']
                    })
                    
                    # Mark slots as used
                    used_slots.add(staff_slot_key)
                    used_slots.add(f"{selected_classroom['id']}-{day}-{time_slot}")
                    
                    # Update workload
                    staff_workload[selected_staff['id']] += 1
                    
                    assigned = True
                    break
    
    return timetable

def save_timetable(department_id, timetable):
    """Save timetable to database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get next version
    cursor.execute('''
        SELECT COALESCE(MAX(version), 0) + 1 as next_version 
        FROM timetables WHERE department_id = ?
    ''', (department_id,))
    version = cursor.fetchone()['next_version']
    
    # Insert timetable entries
    for entry in timetable:
        cursor.execute('''
            INSERT INTO timetables 
            (department_id, day, time_slot, subject_id, staff_id, classroom_id, version)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            department_id,
            entry['day'],
            entry['time_slot'],
            entry['subject_id'],
            entry['staff_id'],
            entry['classroom_id'],
            version
        ))
    
    conn.commit()
    conn.close()

@app.route('/api/timetable/export', methods=['POST'])
@verify_clerk_token
def export_timetable():
    data = request.get_json()
    
    try:
        department_id = data['department_id']
        
        # In a real implementation, generate Excel file using openpyxl
        # For now, return success message
        
        return jsonify({
            'success': True,
            'message': 'Timetable exported successfully',
            'download_url': f'/downloads/timetable_dept_{department_id}.xlsx'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'SRM Timetable AI Backend is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)