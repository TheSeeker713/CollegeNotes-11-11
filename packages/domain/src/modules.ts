export const COURSE_MODULES = [
  { id: 'reading', label: 'Reading', description: 'Read and annotate your course sources.', available: true },
  { id: 'notes', label: 'Notes', description: 'Keep a local course note in your workspace.', available: true },
  { id: 'study', label: 'Study', description: 'Practice with source-linked learning activities.', available: true },
  { id: 'research', label: 'Research', description: 'Gather web evidence through a connection you choose.', available: true },
  { id: 'tutoring', label: 'Tutoring', description: 'Work through your material with an optional AI service.', available: true },
  { id: 'audio', label: 'Audio', description: 'Listen to material and use voice tools.', available: true },
  { id: 'practice', label: 'Presentation practice', description: 'Rehearse presentations using your own material.', available: true },
  { id: 'visuals', label: 'Subject visuals', description: 'Explore optional visual explanations.', available: true }
] as const;
export type CourseModuleId = typeof COURSE_MODULES[number]['id'];
export type ModuleSelection = { moduleId: CourseModuleId; schemaVersion: 1; enabled: boolean };
export function isCourseModuleId(value: unknown): value is CourseModuleId {
  return COURSE_MODULES.some((m) => m.id === value);
}

export const MODULE_CAPABILITIES=['sourceTemplates','localNotes'] as const;
export type ModuleCapability=typeof MODULE_CAPABILITIES[number];
export type ModuleDefinition={id:string;label:string;description:string;schemaVersion:number;capabilities:ModuleCapability[]};
export class ModuleRegistry{
  private definitions=new Map<string,ModuleDefinition>();
  constructor(){for(const module of COURSE_MODULES)this.definitions.set(module.id,{...module,schemaVersion:1,capabilities:[]});}
  register(input:unknown):ModuleDefinition{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_module_definition');
    const row=input as Record<string,unknown>;
    if(Object.keys(row).some(key=>!['id','label','description','schemaVersion','capabilities'].includes(key))||
      typeof row.id!=='string'||!/^[a-z][a-z0-9_-]{1,63}$/.test(row.id)||
      typeof row.label!=='string'||!row.label.trim()||row.label.length>100||
      typeof row.description!=='string'||row.description.length>500||
      row.schemaVersion!==1||!Array.isArray(row.capabilities)||
      row.capabilities.some(capability=>!MODULE_CAPABILITIES.includes(capability as ModuleCapability))||
      new Set(row.capabilities).size!==row.capabilities.length)throw new Error('invalid_module_definition');
    if(this.definitions.has(row.id))throw new Error('module_already_registered');
    const definition:ModuleDefinition={id:row.id,label:row.label,description:row.description,schemaVersion:1,capabilities:[...row.capabilities] as ModuleCapability[]};
    this.definitions.set(definition.id,definition);
    return definition;
  }
  get(id:string){return this.definitions.get(id)??null;}
  list(){return [...this.definitions.values()];}
}
