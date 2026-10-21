import { describe, expect, it } from 'vitest';
import { commands, curriculumVersion, exercises, modules } from './curriculum';
import { validateCurriculum } from './curriculumValidation';

describe('curriculum manifest', () => {
  it('loads the versioned content artifact', () => {
    expect(curriculumVersion).toBe('v5');
    expect(modules.flatMap((module) => module.lessons).some((lesson) => lesson.labRoute.includes('?preset='))).toBe(true);
    expect(modules.flatMap((module) => module.lessons).every((lesson) => lesson.challenge.length > 20)).toBe(true);
  });

  it('contains the twelve OS A2Z modules', () => {
    expect(modules).toHaveLength(12);
    expect(modules.every((module) => module.lessons.length >= 3)).toBe(true);
    expect(modules.flatMap((module) => module.lessons).every((lesson) => lesson.labRoute.startsWith('/'))).toBe(true);
    expect(new Set(modules.map((module) => module.id)).size).toBe(modules.length);
  });

  it('has resolvable prerequisites and lesson IDs', () => {
    const moduleIds = new Set(modules.map((module) => module.id));
    const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    expect(modules.flatMap((module) => module.prerequisites).every((id) => moduleIds.has(id))).toBe(true);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
  });

  it('keeps exercises attached to known modules and commands uniquely named', () => {
    const moduleIds = new Set(modules.map((module) => module.id));
    expect(exercises.every((exercise) => moduleIds.has(exercise.moduleId))).toBe(true);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length);
    expect(new Set(modules.map((module) => module.id)).size).toBe(
      new Set(exercises.map((exercise) => exercise.moduleId)).size,
    );
    expect(new Set(commands.map((command) => command.name)).size).toBe(commands.length);
  });

  it('validates content references and schemas', () => {
    expect(validateCurriculum()).toEqual({ valid: true, errors: [] });
  });
});
