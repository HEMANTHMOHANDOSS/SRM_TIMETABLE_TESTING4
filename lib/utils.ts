import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function validateSRMEmail(email: string): boolean {
  return email.endsWith('@srmist.edu.in');
}

export function getConstraintKey(constraint: { role: string; subject_type: string; department_id?: number }) {
  return `${constraint.department_id || 'global'}-${constraint.role}-${constraint.subject_type}`;
}