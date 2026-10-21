import { z } from 'zod';
import rawContent from '../content/curriculum.v5.json';
import type { Command, Exercise, Module } from '../types';

const lessonSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  duration: z.string().min(1),
  labRoute: z.string().startsWith('/'),
  challenge: z.string().min(1),
  objectives: z.array(z.string()).min(1),
  workedExample: z.string().min(1),
  mistakes: z.array(z.string()).min(1),
  recap: z.string().min(1),
});

const moduleSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.string().min(1),
  accent: z.string().regex(/^#/),
  prerequisites: z.array(z.string()),
  lessons: z.array(lessonSchema).min(1),
});

const commandSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  syntax: z.string().min(1),
  concept: z.string().min(1),
  examples: z.array(z.object({ input: z.string(), output: z.string() })).min(1),
  safety: z.string().optional(),
});

const exerciseSchema = z.object({
  id: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().min(1),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  type: z.enum(['multiple-choice', 'short-answer', 'terminal', 'algorithm']),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string().min(1),
  points: z.number().int().positive(),
});

const contentSchema = z.object({
  version: z.string().regex(/^v\d+$/),
  modules: z.array(moduleSchema).min(1),
  commands: z.array(commandSchema).min(1),
  exercises: z.array(exerciseSchema).min(1),
});

const content = contentSchema.parse(rawContent);

export const curriculumVersion = content.version;
export const modules: Module[] = content.modules;
export const commands: Command[] = content.commands;
export const exercises: Exercise[] = content.exercises;

export function getModule(slug: string) { return modules.find((module) => module.slug === slug); }
export function getLesson(slug: string) { return modules.flatMap((module) => module.lessons).find((item) => item.slug === slug); }
export function getExercise(id: string) { return exercises.find((exercise) => exercise.id === id); }
