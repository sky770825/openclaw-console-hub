/**
 * Integration Tests - Multi-Agent Coordination
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CentralCoordinator } from "../src/coordinator/index.js";
import { WorkflowEngine } from "../src/workflow/index.js";
import { MCPProtocol, MCPInMemoryTransport } from "../src/mcp/index.js";

describe("Multi-Agent Integration", () => {
  let coordinatorTransport: MCPInMemoryTransport;
  let coordinatorProtocol: MCPProtocol;
  let coordinator: CentralCoordinator;

  beforeEach(() => {
    MCPInMemoryTransport.reset();
    coordinatorTransport = new MCPInMemoryTransport("coordinator");
    coordinatorProtocol = new MCPProtocol("coordinator", coordinatorTransport, {});
    coordinator = new CentralCoordinator(coordinatorProtocol);
  });

  afterEach(async () => {
    await coordinatorProtocol.close();
  });

  it("should coordinate multiple agents", async () => {
    // Register multiple agents
    coordinator.registerAgent("agent1", "executor");
    coordinator.registerAgent("agent2", "executor");
    coordinator.registerAgent("reviewer1", "reviewer");

    expect(coordinator.getAllAgents()).toHaveLength(3);
    expect(coordinator.getAgentsByRole("executor")).toHaveLength(2);
    expect(coordinator.getAgentsByRole("reviewer")).toHaveLength(1);
  });

  it("should submit and track tasks", async () => {
    coordinator.registerAgent("agent1", "executor");

    const taskId = await coordinator.submitTask("Test task", "agent1");
    const task = coordinator.getTask(taskId);

    expect(task).toBeDefined();
    expect(task?.description).toBe("Test task");
    expect(task?.status).toBe("assigned");
  });

  it("should route tasks to appropriate agents", async () => {
    const receivedGoals: string[] = [];

    // Setup agent with goal handler
    const agentTransport = new MCPInMemoryTransport("specialist1");
    new MCPProtocol("specialist1", agentTransport, {
      onGoal: async (goal) => {
        receivedGoals.push(goal.description);
      },
    });

    coordinator.registerAgent("specialist1", "specialist");

    const taskId = await coordinator.submitTask("Specialized task", "specialist1");

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedGoals).toContain("Specialized task");
  });

  it("should handle agent failures gracefully", async () => {
    coordinator.registerAgent("agent1", "executor");

    const taskId = await coordinator.submitTask("Task for failing agent", "agent1");

    // Unregister agent (simulates failure)
    const result = coordinator.unregisterAgent("agent1");
    expect(result).toBe(true);

    // Task should be marked as failed or reassigned
    const task = coordinator.getTask(taskId);
    expect(task?.status).toBe("failed");
  });

  it("should execute complex multi-agent workflow", async () => {
    const workflowEngine = new WorkflowEngine(coordinatorProtocol);
    coordinator = new CentralCoordinator(coordinatorProtocol, {}, workflowEngine);

    // Setup agents
    const executorTransport = new MCPInMemoryTransport("executor1");
    new MCPProtocol("executor1", executorTransport, {
      onGoal: async () => {},
    });

    const reviewerTransport = new MCPInMemoryTransport("reviewer1");
    new MCPProtocol("reviewer1", reviewerTransport, {
      onGoal: async () => {},
    });

    coordinator.registerAgent("executor1", "executor");
    coordinator.registerAgent("reviewer1", "reviewer");

    // Submit workflow
    const workflowId = await coordinator.submitWorkflow({
      id: "complex-wf",
      name: "Complex Workflow",
      version: "1.0.0",
      tasks: [
        {
          id: "execute",
          name: "Execute Task",
          type: "agent_call",
          agentId: "executor1",
        },
        {
          id: "review",
          name: "Review Task",
          type: "agent_call",
          agentId: "reviewer1",
          dependencies: ["execute"],
        },
      ],
    });

    expect(workflowId).toBe("complex-wf");
  });

  it("should broadcast messages to all agents", async () => {
    const receivedMessages: string[] = [];

    // Setup multiple agents
    const agent1Transport = new MCPInMemoryTransport("agent1");
    new MCPProtocol("agent1", agent1Transport, {
      onGoal: async (goal) => {
        receivedMessages.push(`agent1: ${goal.description}`);
      },
    });

    const agent2Transport = new MCPInMemoryTransport("agent2");
    new MCPProtocol("agent2", agent2Transport, {
      onGoal: async (goal) => {
        receivedMessages.push(`agent2: ${goal.description}`);
      },
    });

    coordinator.registerAgent("agent1", "executor");
    coordinator.registerAgent("agent2", "executor");

    // Send broadcast goal
    await coordinatorProtocol.sendGoal("*", {
      id: "broadcast",
      description: "Broadcast message",
      priority: "low",
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedMessages).toContain("agent1: Broadcast message");
    expect(receivedMessages).toContain("agent2: Broadcast message");
  });
});
