import type { Task } from '@/types';
import { loadTasks, saveTasks } from './seed';
import { optionalDelay } from './config';

export async function getTasks(): Promise<Task[]> {
  await optionalDelay();
  return loadTasks();
}

export async function getTask(id: string): Promise<Task | undefined> {
  await optionalDelay();
  return loadTasks().find((t) => t.id === id);
}

export async function createTask(
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Task> {
  await optionalDelay();
  const tasks = loadTasks();
  const newTask: Task = {
    ...task,
    id: `task-${String(tasks.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.unshift(newTask);
  saveTasks(tasks);
  return newTask;
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task | undefined> {
  await optionalDelay();
  const tasks = loadTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return undefined;
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTasks(tasks);
  return tasks[index];
}
