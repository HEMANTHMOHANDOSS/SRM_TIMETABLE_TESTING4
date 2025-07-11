import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, userQueries } from '@/lib/database';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userRole = sessionClaims?.metadata?.role;
    if (userRole !== 'department_admin' && userRole !== 'main_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { department_id } = await request.json();
    
    if (!department_id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }
    
    // Get internal user
    const internalUser = userQueries.getUserByClerkId.get(userId);
    if (!internalUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user has access to this department
    if (userRole === 'department_admin' && internalUser.department_id !== department_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Fetch department data
    const department = db.prepare('SELECT * FROM departments WHERE id = ?').get(department_id);
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    
    // Fetch subjects
    const subjects = db.prepare('SELECT * FROM subjects WHERE department_id = ?').all(department_id);
    
    // Fetch staff with selected subjects
    const staff = db.prepare(`
      SELECT * FROM users 
      WHERE department_id = ? AND role = 'staff' AND subjects_locked = 1
    `).all(department_id);
    
    // Fetch classrooms
    const classrooms = db.prepare('SELECT * FROM classrooms WHERE department_id = ?').all(department_id);
    
    // Fetch constraints
    const constraints = db.prepare(`
      SELECT * FROM constraints 
      WHERE department_id = ? OR department_id IS NULL
    `).all(department_id);
    
    if (subjects.length === 0 || staff.length === 0 || classrooms.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient data for timetable generation' },
        { status: 400 }
      );
    }
    
    // Generate timetable using AI
    const timetable = await generateTimetableWithAI({
      department,
      subjects,
      staff,
      classrooms,
      constraints,
    });
    
    // Save timetable to database
    const version = await saveTimetable(department_id, timetable);
    
    return NextResponse.json({
      success: true,
      department: department.name,
      timetable,
      version,
      generated_at: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error generating timetable:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateTimetableWithAI(data: any) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '14:00-15:00', '15:00-16:00', '16:00-17:00'
  ];
  
  // Create prompt for AI
  const prompt = `
    Generate an optimal timetable for ${data.department.name} department with the following data:
    
    Subjects: ${JSON.stringify(data.subjects)}
    Staff: ${JSON.stringify(data.staff)}
    Classrooms: ${JSON.stringify(data.classrooms)}
    Constraints: ${JSON.stringify(data.constraints)}
    
    Days: ${days.join(', ')}
    Time Slots: ${timeSlots.join(', ')}
    
    Rules:
    1. No staff member should have overlapping classes
    2. No classroom should have overlapping bookings
    3. Respect staff workload constraints
    4. Distribute classes evenly across the week
    5. Consider subject credits for frequency
    
    Return a JSON array of timetable entries with format:
    [{"day": "Monday", "time_slot": "09:00-10:00", "subject_id": 1, "staff_id": "uuid", "classroom_id": 1}]
  `;
  
  try {
    // Try Groq first
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert timetable scheduler. Generate optimal academic schedules following all constraints. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.3,
      max_tokens: 4096,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const aiTimetable = JSON.parse(jsonMatch[0]);
      return validateAndOptimizeTimetable(aiTimetable, data);
    }
  } catch (error) {
    console.log('Groq failed, trying Gemini:', error);
    
    try {
      // Fallback to Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const aiTimetable = JSON.parse(jsonMatch[0]);
        return validateAndOptimizeTimetable(aiTimetable, data);
      }
    } catch (geminiError) {
      console.log('Gemini also failed, using rule-based generation');
    }
  }
  
  // Fallback to rule-based generation
  return generateRuleBasedTimetable(data);
}

function validateAndOptimizeTimetable(timetable: any[], data: any) {
  const validTimetable = [];
  const usedSlots = new Set();
  const staffSchedule = new Map();
  const classroomSchedule = new Map();
  
  for (const slot of timetable) {
    const slotKey = `${slot.day}-${slot.time_slot}`;
    const staffSlotKey = `${slot.staff_id}-${slotKey}`;
    const classroomSlotKey = `${slot.classroom_id}-${slotKey}`;
    
    // Validate slot data
    if (!data.subjects.find((s: any) => s.id === slot.subject_id) ||
        !data.staff.find((s: any) => s.id === slot.staff_id) ||
        !data.classrooms.find((c: any) => c.id === slot.classroom_id)) {
      continue;
    }
    
    // Check for conflicts
    if (!staffSchedule.has(staffSlotKey) && !classroomSchedule.has(classroomSlotKey)) {
      validTimetable.push(slot);
      staffSchedule.set(staffSlotKey, true);
      classroomSchedule.set(classroomSlotKey, true);
    }
  }
  
  return validTimetable;
}

function generateRuleBasedTimetable(data: any) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '14:00-15:00', '15:00-16:00', '16:00-17:00'
  ];
  
  const timetable = [];
  const usedSlots = new Set();
  const staffWorkload = new Map();
  
  // Initialize staff workload
  data.staff.forEach((s: any) => staffWorkload.set(s.id, 0));
  
  for (const subject of data.subjects) {
    // Find available staff for this subject
    const availableStaff = data.staff.filter((s: any) => {
      if (!s.subjects_selected) return false;
      const selectedSubjects = JSON.parse(s.subjects_selected);
      return selectedSubjects.includes(subject.id);
    });
    
    if (availableStaff.length === 0) continue;
    
    // Calculate classes needed based on credits
    const classesNeeded = Math.max(subject.credits, 1);
    
    for (let i = 0; i < classesNeeded; i++) {
      let assigned = false;
      
      for (const day of days) {
        if (assigned) break;
        
        for (const timeSlot of timeSlots) {
          const slotKey = `${day}-${timeSlot}`;
          
          // Find staff with least workload
          const selectedStaff = availableStaff.reduce((prev, current) => {
            const prevWorkload = staffWorkload.get(prev.id) || 0;
            const currentWorkload = staffWorkload.get(current.id) || 0;
            return currentWorkload < prevWorkload ? current : prev;
          });
          
          // Check staff availability
          const staffSlotKey = `${selectedStaff.id}-${slotKey}`;
          if (usedSlots.has(staffSlotKey)) continue;
          
          // Find suitable classroom
          const suitableClassrooms = data.classrooms.filter((c: any) => {
            const roomSlotKey = `${c.id}-${slotKey}`;
            return !usedSlots.has(roomSlotKey);
          });
          
          if (suitableClassrooms.length === 0) continue;
          
          const selectedClassroom = suitableClassrooms[0];
          
          // Assign the slot
          timetable.push({
            day,
            time_slot: timeSlot,
            subject_id: subject.id,
            staff_id: selectedStaff.id,
            classroom_id: selectedClassroom.id,
          });
          
          // Mark slots as used
          usedSlots.add(staffSlotKey);
          usedSlots.add(`${selectedClassroom.id}-${slotKey}`);
          
          // Update workload
          staffWorkload.set(selectedStaff.id, (staffWorkload.get(selectedStaff.id) || 0) + 1);
          
          assigned = true;
          break;
        }
      }
    }
  }
  
  return timetable;
}

async function saveTimetable(departmentId: number, timetable: any[]) {
  // Get next version number
  const getMaxVersion = db.prepare(`
    SELECT COALESCE(MAX(version), 0) as max_version 
    FROM timetables 
    WHERE department_id = ?
  `);
  const { max_version } = getMaxVersion.get(departmentId) as any;
  const newVersion = max_version + 1;
  
  // Insert new timetable
  const insertTimetable = db.prepare(`
    INSERT INTO timetables (department_id, day, time_slot, subject_id, staff_id, classroom_id, version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    for (const slot of timetable) {
      insertTimetable.run(
        departmentId,
        slot.day,
        slot.time_slot,
        slot.subject_id,
        slot.staff_id,
        slot.classroom_id,
        newVersion
      );
    }
  });
  
  transaction();
  return newVersion;
}