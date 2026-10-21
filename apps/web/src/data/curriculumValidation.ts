import { z } from 'zod';
import { modules } from './curriculum';

const lessonSchema = z.object({ id: z.string().min(1), slug: z.string().min(1), title: z.string().min(1), summary: z.string().min(1), duration: z.string().min(1), objectives: z.array(z.string()).min(1), workedExample: z.string().min(1), mistakes: z.array(z.string()).min(1), recap: z.string().min(1) });
const moduleSchema = z.object({ id: z.string().min(1), slug: z.string().min(1), number: z.number().int().positive(), title: z.string().min(1), description: z.string().min(1), difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']), duration: z.string().min(1), accent: z.string().regex(/^#/), prerequisites: z.array(z.string()), lessons: z.array(lessonSchema).min(1) });

export function validateCurriculum() {
  const errors: string[] = [];
  const parsed = z.array(moduleSchema).safeParse(modules);
  if (!parsed.success) errors.push(...parsed.error.issues.map((issue) => issue.message));
  const moduleIds = new Set(modules.map((module) => module.id)); const lessonIds = new Set<string>();
  modules.forEach((module) => {
    module.prerequisites.forEach((id) => { if (!moduleIds.has(id)) errors.push(`${module.id} references missing prerequisite ${id}`); });
    module.lessons.forEach((lesson) => { if (lessonIds.has(lesson.id)) errors.push(`duplicate lesson ID ${lesson.id}`); lessonIds.add(lesson.id); });
  });
  if (new Set(modules.map((module) => module.id)).size !== modules.length) errors.push('duplicate module ID');
  return { valid: errors.length === 0, errors };
}
