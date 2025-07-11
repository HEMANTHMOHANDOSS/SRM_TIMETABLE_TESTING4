import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { db } from './database';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export interface TimetableSlot {
  day: string;
  timeSlot: string;
  subjectId: number;
  staffId: string;
  classroomId: number;
}

export interface TimetableGenerationData {
  departmentId: number;
  subjects: any[];
  staff: any[];
  classrooms: any[];
  constraints: any[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
];

export async function generateTimetableWithAI(data: TimetableGenerationData): Promise<TimetableSlot[]> {
  try {
    // Prepare data for AI
    const prompt = createTimetablePrompt(data);
    
    // Try Gemini first, fallback to Groq
    let aiResponse;
    try {
      aiResponse = await generateWithGemini(prompt);
    } catch (error) {
      console.log('Gemini failed, trying Groq:', error);
      aiResponse = await generateWithGroq(prompt);
    }

    // Parse AI response and validate
    const timetable = parseAIResponse(aiResponse, data);
    
    // Apply additional optimization
    const optimizedTimetable = optimizeTimetable(timetable, data);
    
    return optimizedTimetable;
  } catch (error) {
    console.error('AI timetable generation failed:', error);
    // Fallback to rule-based generation
    return generateRuleBasedTimetable(data);
  }
}

function createTimetablePrompt(data: TimetableGenerationData): string {
  const { subjects, staff, classrooms, constraints } = data;

  return `
Generate an optimal weekly timetable for a university department with the following constraints:

SUBJECTS:
${subjects.map(s => `- ${s.name} (${s.code}): ${s.credits} credits, ${s.subject_type}, Department: ${s.department_id}`).join('\n')}

STAFF:
${staff.map(s => `- ${s.name} (${s.staff_role}): Selected subjects [${s.subjects_selected || 'none'}]`).join('\n')}

CLASSROOMS:
${classrooms.map(c => `- ${c.name}: Capacity ${c.capacity}, Type: ${c.room_type}`).join('\n')}

CONSTRAINTS:
${constraints.map(c => `- ${c.role}: Max ${c.max_subjects} subjects, Max ${c.max_hours} hours/week, Subject type: ${c.subject_type}`).join('\n')}

SCHEDULE REQUIREMENTS:
- Days: Monday to Friday
- Time slots: 09:00-10:00, 10:00-11:00, 11:00-12:00, 12:00-13:00, 14:00-15:00, 15:00-16:00, 16:00-17:00
- Theory subjects need lecture halls, Lab subjects need lab rooms
- No staff member should have overlapping classes
- No classroom should have overlapping bookings
- Respect staff workload constraints
- Distribute classes evenly across the week

Return ONLY a JSON array of timetable slots in this exact format:
[
  {
    "day": "Monday",
    "timeSlot": "09:00-10:00",
    "subjectId": 1,
    "staffId": "staff_id",
    "classroomId": 1
  }
]

Ensure the JSON is valid and complete.
`;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });

  return result.response.text();
}

async function generateWithGroq(prompt: string): Promise<string> {
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

  return completion.choices[0]?.message?.content || '';
}

function parseAIResponse(response: string, data: TimetableGenerationData): TimetableSlot[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and filter valid slots
    return parsed.filter((slot: any) => {
      return (
        DAYS.includes(slot.day) &&
        TIME_SLOTS.includes(slot.timeSlot) &&
        data.subjects.some(s => s.id === slot.subjectId) &&
        data.staff.some(s => s.id === slot.staffId) &&
        data.classrooms.some(c => c.id === slot.classroomId)
      );
    });
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return [];
  }
}

function optimizeTimetable(timetable: TimetableSlot[], data: TimetableGenerationData): TimetableSlot[] {
  // Remove conflicts and optimize distribution
  const optimized: TimetableSlot[] = [];
  const usedSlots = new Set<string>();
  const staffSchedule = new Map<string, Set<string>>();
  const classroomSchedule = new Map<number, Set<string>>();

  for (const slot of timetable) {
    const slotKey = `${slot.day}-${slot.timeSlot}`;
    const staffSlotKey = `${slot.staffId}-${slotKey}`;
    const classroomSlotKey = `${slot.classroomId}-${slotKey}`;

    // Check for conflicts
    if (
      !staffSchedule.get(slot.staffId)?.has(slotKey) &&
      !classroomSchedule.get(slot.classroomId)?.has(slotKey)
    ) {
      optimized.push(slot);
      
      // Track usage
      if (!staffSchedule.has(slot.staffId)) {
        staffSchedule.set(slot.staffId, new Set());
      }
      staffSchedule.get(slot.staffId)!.add(slotKey);
      
      if (!classroomSchedule.has(slot.classroomId)) {
        classroomSchedule.set(slot.classroomId, new Set());
      }
      classroomSchedule.get(slot.classroomId)!.add(slotKey);
    }
  }

  return optimized;
}

function generateRuleBasedTimetable(data: TimetableGenerationData): TimetableSlot[] {
  const { subjects, staff, classrooms } = data;
  const timetable: TimetableSlot[] = [];
  const usedSlots = new Set<string>();
  const staffWorkload = new Map<string, number>();

  // Initialize staff workload
  staff.forEach(s => staffWorkload.set(s.id, 0));

  for (const subject of subjects) {
    // Find available staff for this subject
    const availableStaff = staff.filter(s => {
      const selectedSubjects = s.subjects_selected ? JSON.parse(s.subjects_selected) : [];
      return selectedSubjects.includes(subject.id);
    });

    if (availableStaff.length === 0) continue;

    // Calculate classes needed based on credits
    const classesNeeded = Math.max(subject.credits, 1);

    for (let i = 0; i < classesNeeded; i++) {
      let assigned = false;

      for (const day of DAYS) {
        if (assigned) break;

        for (const timeSlot of TIME_SLOTS) {
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
          const suitableClassrooms = classrooms.filter(c => {
            const roomSlotKey = `${c.id}-${slotKey}`;
            return !usedSlots.has(roomSlotKey) && 
                   ((subject.subject_type === 'lab' && c.room_type === 'lab') ||
                    (subject.subject_type === 'theory' && c.room_type !== 'lab'));
          });

          if (suitableClassrooms.length === 0) continue;

          const selectedClassroom = suitableClassrooms[0];

          // Assign the slot
          timetable.push({
            day,
            timeSlot,
            subjectId: subject.id,
            staffId: selectedStaff.id,
            classroomId: selectedClassroom.id,
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

export async function saveTimetable(departmentId: number, timetable: TimetableSlot[]): Promise<number> {
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
        slot.timeSlot,
        slot.subjectId,
        slot.staffId,
        slot.classroomId,
        newVersion
      );
    }
  });

  transaction();
  return newVersion;
}