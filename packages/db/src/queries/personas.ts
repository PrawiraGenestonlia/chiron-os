import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { personas } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { PersonaCreate, PersonaUpdate } from "@chiron-os/shared";

export function getAllPersonas() {
  return db.select().from(personas).all();
}

export function getPersonaById(id: string) {
  return db.select().from(personas).where(eq(personas.id, id)).get();
}

export function getPersonaByShortCode(shortCode: string) {
  return db.select().from(personas).where(eq(personas.shortCode, shortCode)).get();
}

export function createPersona(data: PersonaCreate) {
  const now = nowISO();
  const id = generateId();
  db.insert(personas)
    .values({
      id,
      ...data,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getPersonaById(id)!;
}

export function updatePersona(id: string, data: PersonaUpdate) {
  db.update(personas)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(personas.id, id))
    .run();
  return getPersonaById(id);
}

export function deletePersona(id: string) {
  db.delete(personas).where(eq(personas.id, id)).run();
}
