/**
 * Workflow Orchestration Module
 * Enhanced with dependency resolution and parallel execution.
 */

import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { MCPProtocol, MCPGoal, MCPToolResult } from "../mcp/index.js";

export type TaskStatus = 
  | "pending"
  | "waiting"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped";

export type TaskType = 
  | "sequential"
  | "parallel"
  | "agent_call"
  | "tool_call";

export interface WorkflowTask {
  id: string;
  name: string;
  type: TaskType;
  agentId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  dependencies?: string[];
  parallelTasks?: WorkflowTask[]; // For 'parallel' or 'sequential' container tasks
  onFailure?: "fail" | "continue";
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  tasks: WorkflowTask[];
}

export interface TaskExecution {
  taskId: string;
  status: TaskStatus;
  result?: unknown;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "running" | "completed" | "failed";
  tasks: Map<string, TaskExecution>;
  results: Record<string, unknown>;
}

export class WorkflowEngine extends EventEmitter {
  private workflows = new Map<string, WorkflowDefinition>();
  private mcpProtocol: MCPProtocol;

  constructor(mcpProtocol: MCPProtocol) {
    super();
    this.mcpProtocol = mcpProtocol;
  }

  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  getWorkflow(id: string) { return this.workflows.get(id); }

  async executeWorkflow(workflowId: string): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const execution: WorkflowExecution = {
      id: randomUUID(),
      workflowId,
      status: "running",
      tasks: new Map(),
      results: {},
    };

    this.emit("workflow_started", { workflowId, executionId: execution.id });

    try {
      // Flatten tasks for dependency checking if they are not nested in containers
      // For simplicity, we assume top-level tasks or handle containers recursively.
      // Here we implement the "Scheduler" loop.
      
      const allTasks = new Map<string, WorkflowTask>();
      const collectTasks = (tasks: WorkflowTask[]) => {
        for (const t of tasks) {
          allTasks.set(t.id, t);
          execution.tasks.set(t.id, { taskId: t.id, status: "pending" });
          if (t.parallelTasks) collectTasks(t.parallelTasks);
        }
      };
      collectTasks(workflow.tasks);

      // Main Execution Loop
      let active = true;
      while (active) {
        const pending = Array.from(execution.tasks.values()).filter(t => t.status === "pending");
        const running = Array.from(execution.tasks.values()).filter(t => t.status === "running");
        
        if (pending.length === 0 && running.length === 0) {
          active = false;
          break;
        }

        const readyTasks = pending.filter(t => {
          const taskDef = allTasks.get(t.taskId);
          if (!taskDef) return false;
          
          // Check dependencies
          if (taskDef.dependencies && taskDef.dependencies.length > 0) {
            const depsMet = taskDef.dependencies.every(depId => {
              const dep = execution.tasks.get(depId);
              return dep && dep.status === "completed";
            });
            if (!depsMet) return false;
          }
          return true;
        });

        if (readyTasks.length === 0 && running.length === 0 && pending.length > 0) {
           throw new Error("Deadlock detected in workflow execution");
        }

        // Execute ready tasks
        const promises = readyTasks.map(t => this.runTask(allTasks.get(t.taskId)!, execution));
        if (promises.length > 0) {
          await Promise.all(promises);
        } else {
          // Wait a bit if only running tasks exist (in a real event loop we wouldn't block)
          // Since runTask is async and we await Promise.all above, we effectively wait for at least one batch.
          // If we have mixed running/ready, we might need more complex concurrency control.
          // For this impl, we just continue.
        }
      }

      execution.status = "completed";
      this.emit("workflow_completed", { workflowId, executionId: execution.id, results: execution.results });
    } catch (e) {
      execution.status = "failed";
      this.emit("workflow_failed", { workflowId, executionId: execution.id, error: String(e) });
      throw e;
    }

    return execution;
  }

  private async runTask(task: WorkflowTask, execution: WorkflowExecution): Promise<void> {
    const exec = execution.tasks.get(task.id)!;
    exec.status = "running";
    this.emit("task_started", { taskId: task.id, executionId: execution.id });

    try {
      switch (task.type) {
        case "agent_call":
          if (task.agentId) {
            const goal: MCPGoal = {
              id: randomUUID(),
              description: task.name,
              priority: "medium",
            };
            await this.mcpProtocol.sendGoal(task.agentId, goal);
            // In a real system, we'd wait for the goal completion event.
            // Here we simulate immediate success for the goal *submission*, 
            // but effectively we assume synchronous completion or simple ack for this demo.
            exec.result = { goalId: goal.id };
          }
          break;

        case "tool_call":
          if (task.agentId && task.toolName) {
            const result = await this.mcpProtocol.callTool(task.agentId, task.toolName, task.toolArgs || {});
            if (!result.success) throw new Error(result.error);
            exec.result = result.result;
          }
          break;

        case "parallel":
          if (task.parallelTasks) {
            await Promise.all(task.parallelTasks.map(t => this.runTask(t, execution)));
          }
          break;
          
        case "sequential":
          if (task.parallelTasks) {
            for (const t of task.parallelTasks) {
              await this.runTask(t, execution);
            }
          }
          break;
      }

      exec.status = "completed";
      execution.results[task.id] = exec.result;
      this.emit("task_completed", { taskId: task.id, executionId: execution.id });

    } catch (error) {
      exec.status = "failed";
      exec.error = String(error);
      this.emit("task_failed", { taskId: task.id, executionId: execution.id, error: exec.error });
      
      if (task.onFailure !== "continue") {
        throw error; // Stop workflow
      }
    }
  }
}
