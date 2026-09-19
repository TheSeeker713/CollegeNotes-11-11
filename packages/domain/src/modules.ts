export const COURSE_MODULES = [
  { id: 'reading', label: 'Reading', description: 'Read and annotate your course sources.', available: true },
  { id: 'notes', label: 'Notes', description: 'Keep a local course note in your workspace.', available: true },
  { id: 'study', label: 'Study', description: 'Practice with source-linked learning activities.', available: false },
  { id: 'research', label: 'Research', description: 'Gather web evidence through a connection you choose.', available: true },
  { id: 'tutoring', label: 'Tutoring', description: 'Work through your material with an optional AI service.', available: true },
  { id: 'audio', label: 'Audio', description: 'Listen to material and use voice tools.', available: true },
  { id: 'practice', label: 'Presentation practice', description: 'Rehearse presentations using your own material.', available: true },
  { id: 'visuals', label: 'Subject visuals', description: 'Explore optional visual explanations.', available: false }
] as const;
export type CourseModuleId = typeof COURSE_MODULES[number]['id'];
export type ModuleSelection = { moduleId: CourseModuleId; schemaVersion: 1; enabled: boolean };
export function isCourseModuleId(value: unknown): value is CourseModuleId {
  return COURSE_MODULES.some((m) => m.id === value);
}
