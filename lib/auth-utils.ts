import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { userQueries } from './database';

export function generateCredentials(name: string, employeeId: string) {
  // Generate username from name and employee ID
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  const username = `${cleanName.substring(0, 6)}${employeeId.slice(-3)}`;
  
  // Generate random password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return { username, password };
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createUser(userData: {
  name: string;
  employee_id: string;
  email: string;
  role: 'department_admin' | 'staff';
  department_id?: number;
  programme?: string;
  type?: string;
  contact_number?: string;
}) {
  const { username, password } = generateCredentials(userData.name, userData.employee_id);
  const passwordHash = hashPassword(password);
  const userId = uuidv4();
  
  try {
    userQueries.createUser.run(
      userId,
      userData.name,
      userData.employee_id,
      userData.email,
      username,
      passwordHash,
      userData.role,
      userData.department_id || null,
      userData.programme || null,
      userData.type || null,
      userData.contact_number || null
    );
    
    return {
      success: true,
      user: { id: userId, username, password },
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: 'Failed to create user',
    };
  }
}

export function authenticateUser(identifier: string, password: string) {
  // Try to find user by email or username
  let user = userQueries.getUserByEmail.get(identifier);
  if (!user) {
    user = userQueries.getUserByUsername.get(identifier);
  }
  
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }
  
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
  };
}