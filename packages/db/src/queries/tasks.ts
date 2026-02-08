import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { tasks, taskDependencies } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { TaskCreate, TaskUpdate } from "@chiron-os/shared";

export function getTasksByTeam(teamId: string) {
  return db.select().from(tasks).where(eq(tasks.teamId, teamId)).all();
}

export function getTaskById(id: string) {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(data: TaskCreate) {
  const now = nowISO();
  const id = generateId();
  db.insert(tasks)
    .values({
      id,
      teamId: data.teamId,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "backlog",
      priority: data.priority ?? "medium",
      assigneeId: data.assigneeId ?? null,
      parentTaskId: data.parentTaskId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getTaskById(id)!;
}

export function updateTask(id: string, data: TaskUpdate) {
  db.update(tasks)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(tasks.id, id))
    .run();
  return getTaskById(id);
}

export function deleteTask(id: string) {
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

export function addTaskDependency(taskId: string, dependsOnTaskId: string) {
  const id = generateId();
  db.insert(taskDependencies).values({ id, taskId, dependsOnTaskId }).run();
}

export function getTaskDependencies(taskId: string) {
  return db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, taskId))
    .all();
}
