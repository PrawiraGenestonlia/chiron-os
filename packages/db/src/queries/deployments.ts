import { eq, desc } from "drizzle-orm";
import { db, withTransaction } from "../client.js";
import { deployments } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";
import type { DeploymentCreate, DeploymentUpdate } from "@chiron-os/shared";

export function getDeploymentsByTeam(teamId: string, limit = 50) {
  return db
    .select()
    .from(deployments)
    .where(eq(deployments.teamId, teamId))
    .orderBy(desc(deployments.createdAt))
    .limit(limit)
    .all();
}

export function getDeploymentById(id: string) {
  return db.select().from(deployments).where(eq(deployments.id, id)).get();
}

export function createDeployment(data: DeploymentCreate) {
  return withTransaction(() => {
    const id = generateId();
    const now = nowISO();
    db.insert(deployments)
      .values({
        id,
        teamId: data.teamId,
        agentId: data.agentId ?? null,
        provider: data.provider ?? "vercel",
        projectName: data.projectName,
        deploymentUrl: data.deploymentUrl ?? null,
        inspectUrl: data.inspectUrl ?? null,
        status: data.status ?? "queued",
        environment: data.environment ?? "production",
        commitSha: data.commitSha ?? null,
        commitMessage: data.commitMessage ?? null,
        meta: data.meta ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return getDeploymentById(id)!;
  });
}

export function updateDeployment(id: string, data: DeploymentUpdate) {
  return withTransaction(() => {
    const update: Record<string, unknown> = { updatedAt: nowISO() };
    if (data.status !== undefined) update.status = data.status;
    if (data.deploymentUrl !== undefined) update.deploymentUrl = data.deploymentUrl;
    if (data.inspectUrl !== undefined) update.inspectUrl = data.inspectUrl;
    if (data.environment !== undefined) update.environment = data.environment;
    if (data.meta !== undefined) update.meta = data.meta;
    db.update(deployments).set(update).where(eq(deployments.id, id)).run();
    return getDeploymentById(id);
  });
}
