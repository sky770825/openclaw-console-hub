/**
 * Workflow Engine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowEngine, WorkflowDefinition, WorkflowTask } from "../src/workflow/index.js";
import { MCPProtocol, MCPInMemoryTransport } from "../src/mcp/index.js";

describe("Workflow Engine", () => {
  let engine: WorkflowEngine;
  let protocol: MCPProtocol;
  let transport: MCPInMemoryTransport;

  beforeEach(() => {
    MCPInMemoryTransport.reset();
    transport = new MCPInMemoryTransport("coordinator");
    protocol = new MCPProtocol("coordinator", transport, {});
    engine = new WorkflowEngine(protocol);
  });

  it("should register and execute a simple workflow", async () => {
    const workflow: WorkflowDefinition = {
      id: "wf1",
      name: "Test Workflow",
      version: "1.0.0",
      tasks: [
        {
          id: "task1",
          name: "First Task",
          type: "agent_call",
          agentId: "agent1",
        },
      ],
    };

    engine.registerWorkflow(workflow);
    expect(engine.getWorkflow("wf1")).toEqual(workflow);

    // Register agent to handle the task
    const agentTransport = new MCPInMemoryTransport("agent1");
    new MCPProtocol("agent1", agentTransport, {
      onGoal: async () => {},
    });

    await engine.executeWorkflow("wf1");
    // Should complete without error
  });

  it("should execute tasks with dependencies", async () => {
    const executionOrder: string[] = [];

    const workflow: WorkflowDefinition = {
      id: "wf2",
      name: "Dependency Workflow",
      version: "1.0.0",
      tasks: [
        {
          id: "task1",
          name: "First Task",
          type: "agent_call",
          agentId: "agent1",
        },
        {
          id: "task2",
          name: "Second Task",
          type: "agent_call",
          agentId: "agent1",
          dependencies: ["task1"],
        },
        {
          id: "task3",
          name: "Third Task",
          type: "agent_call",
          agentId: "agent1",
          dependencies: ["task1"],
        },
      ],
    };

    engine.on("task_completed", (event) => {
      executionOrder.push(event.taskId);
    });

    engine.registerWorkflow(workflow);

    // Register agent
    const agentTransport = new MCPInMemoryTransport("agent1");
    new MCPProtocol("agent1", agentTransport, {
      onGoal: async () => {},
    });

    await engine.executeWorkflow("wf2");

    expect(executionOrder).toContain("task1");
    expect(executionOrder).toContain("task2");
    expect(executionOrder).toContain("task3");
    expect(executionOrder.indexOf("task1")).toBeLessThan(executionOrder.indexOf("task2"));
    expect(executionOrder.indexOf("task1")).toBeLessThan(executionOrder.indexOf("task3"));
  });

  it("should execute parallel tasks", async () => {
    const workflow: WorkflowDefinition = {
      id: "wf3",
      name: "Parallel Workflow",
      version: "1.0.0",
      tasks: [
        {
          id: "parallel1",
          name: "Parallel Container",
          type: "parallel",
          parallelTasks: [
            {
              id: "subtask1",
              name: "Subtask 1",
              type: "agent_call",
              agentId: "agent1",
            },
            {
              id: "subtask2",
              name: "Subtask 2",
              type: "agent_call",
              agentId: "agent1",
            },
          ],
        },
      ],
    };

    engine.registerWorkflow(workflow);

    // Register agent
    const agentTransport = new MCPInMemoryTransport("agent1");
    new MCPProtocol("agent1", agentTransport, {
      onGoal: async () => {},
    });

    const execution = await engine.executeWorkflow("wf3");
    expect(execution.status).toBe("completed");
  });

  it("should handle task failures", async () => {
    const workflow: WorkflowDefinition = {
      id: "wf4",
      name: "Failing Workflow",
      version: "1.0.0",
      tasks: [
        {
          id: "failing_task",
          name: "Failing Task",
          type: "tool_call",
          agentId: "agent1",
          toolName: "fail",
        },
      ],
    };

    engine.registerWorkflow(workflow);

    // Register agent that fails
    const agentTransport = new MCPInMemoryTransport("agent1");
    new MCPProtocol("agent1", agentTransport, {
      onToolCall: async () => {
        throw new Error("Intentional failure");
      },
    });

    await expect(engine.executeWorkflow("wf4")).rejects.toThrow();
  });

  it("should emit workflow events", async () => {
    const events: string[] = [];

    engine.on("workflow_started", () => events.push("started"));
    engine.on("task_started", () => events.push("task_started"));
    engine.on("task_completed", () => events.push("task_completed"));
    engine.on("workflow_completed", () => events.push("completed"));

    const workflow: WorkflowDefinition = {
      id: "wf5",
      name: "Event Test Workflow",
      version: "1.0.0",
      tasks: [
        {
          id: "task1",
          name: "Single Task",
          type: "agent_call",
          agentId: "agent1",
        },
      ],
    };

    engine.registerWorkflow(workflow);

    const agentTransport = new MCPInMemoryTransport("agent1");
    new MCPProtocol("agent1", agentTransport, {
      onGoal: async () => {},
    });

    await engine.executeWorkflow("wf5");

    expect(events).toContain("started");
    expect(events).toContain("task_started");
    expect(events).toContain("task_completed");
    expect(events).toContain("completed");
  });
});
