/**
 * Central Coordinator Module
 */

import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { MCPProtocol, MCPGoal } from "../mcp/index.js";

export type AgentRole = "coordinator" | "executor" | "reviewer" | "specialist";

export interface CoordinationTask {
  id: string;
  description: string;
  agentId?: string;
  status: "pending" | "assigned" | "completed" | "failed";
  createdAt: number;
}

export class CentralCoordinator extends EventEmitter {
  private agents = new Map<string, { role: AgentRole; state: string }>();
  private tasks = new Map<string, CoordinationTask>();
  private mcpProtocol: MCPProtocol;

  constructor(mcpProtocol: MCPProtocol) {
    super();
    this.mcpProtocol = mcpProtocol;
  }

  registerAgent(agentId: string, role: AgentRole = "executor"): void {
    this.agents.set(agentId, { role, state: "idle" });
    this.emit("agent_registered", { agentId, role });
  }

  async submitTask(description: string, agentId?: string): Promise<string> {
    const taskId = randomUUID();
    const task: CoordinationTask = {
      id: taskId,
      description,
      agentId,
      status: "pending",
      createdAt: Date.now(),
    };
    this.tasks.set(taskId, task);

    if (agentId) {
      await this.assignToAgent(task, agentId);
    }

    return taskId;
  }

  private async assignToAgent(task: CoordinationTask, agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    task.agentId = agentId;
    task.status = "assigned";

    const goal: MCPGoal = {
      id: randomUUID(),
      description: task.description,
      priority: "medium",
    };

    await this.mcpProtocol.sendGoal(agentId, goal);
    this.emit("task_assigned", { taskId: task.id, agentId });
  }

  getTask(taskId: string): CoordinationTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): CoordinationTask[] {
    return Array.from(this.tasks.values());
  }
}
