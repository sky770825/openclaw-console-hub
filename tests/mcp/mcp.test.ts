/**
 * MCP Protocol Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MCPProtocol,
  MCPInMemoryTransport,
  MCPAgentRegistry,
  MCPContext,
  MCPGoal,
  MCPToolCall,
  MCPToolResult,
  mcpRegistry,
} from "../src/mcp/index.js";

describe("MCP Protocol", () => {
  let transport1: MCPInMemoryTransport;
  let transport2: MCPInMemoryTransport;
  let protocol1: MCPProtocol;
  let protocol2: MCPProtocol;

  beforeEach(() => {
    MCPInMemoryTransport.reset();
    transport1 = new MCPInMemoryTransport("agent1");
    transport2 = new MCPInMemoryTransport("agent2");
  });

  afterEach(async () => {
    await protocol1?.close();
    await protocol2?.close();
  });

  it("should send and receive context messages", async () => {
    const receivedContexts: MCPContext[] = [];

    protocol1 = new MCPProtocol("agent1", transport1, {
      onContext: async (ctx) => receivedContexts.push(ctx),
    });

    protocol2 = new MCPProtocol("agent2", transport2, {});

    const context: Omit<MCPContext, "createdAt"> = {
      sessionId: "session1",
      agentId: "agent1",
      role: "user",
      content: "Hello",
    };

    await protocol2.sendContext("agent1", context);

    // Wait for message processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedContexts).toHaveLength(1);
    expect(receivedContexts[0].content).toBe("Hello");
    expect(receivedContexts[0].agentId).toBe("agent1");
  });

  it("should send and receive goals", async () => {
    const receivedGoals: MCPGoal[] = [];

    protocol1 = new MCPProtocol("agent1", transport1, {
      onGoal: async (goal) => receivedGoals.push(goal),
    });

    protocol2 = new MCPProtocol("agent2", transport2, {});

    const goal: MCPGoal = {
      id: "goal1",
      description: "Test goal",
      priority: "high",
    };

    await protocol2.sendGoal("agent1", goal);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedGoals).toHaveLength(1);
    expect(receivedGoals[0].description).toBe("Test goal");
  });

  it("should execute tool calls", async () => {
    protocol1 = new MCPProtocol("agent1", transport1, {
      onToolCall: async (call: MCPToolCall) => {
        return {
          callId: call.id,
          success: true,
          result: { sum: (call.arguments.a as number) + (call.arguments.b as number) },
          executionTimeMs: 0,
        };
      },
    });

    protocol2 = new MCPProtocol("agent2", transport2, {});

    const result = await protocol2.callTool("agent1", "add", { a: 1, b: 2 });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ sum: 3 });
  });

  it("should handle tool call errors", async () => {
    protocol1 = new MCPProtocol("agent1", transport1, {
      onToolCall: async () => {
        throw new Error("Tool failed");
      },
    });

    protocol2 = new MCPProtocol("agent2", transport2, {});

    const result = await protocol2.callTool("agent1", "error", {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Tool failed");
  });

  it("should timeout tool calls", async () => {
    protocol1 = new MCPProtocol("agent1", transport1, {
      onToolCall: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { callId: "", success: true, executionTimeMs: 1000 };
      },
    });

    protocol2 = new MCPProtocol("agent2", transport2, {});

    await expect(protocol2.callTool("agent1", "slow", {}, 50)).rejects.toThrow("timeout");
  });
});

describe("MCP Agent Registry", () => {
  let registry: MCPAgentRegistry;

  beforeEach(() => {
    registry = new MCPAgentRegistry();
  });

  it("should register and retrieve agents", () => {
    const agent = {
      id: "agent1",
      name: "Test Agent",
      role: "executor",
      capabilities: {
        canHandleContext: true,
        canExecuteTools: true,
        supportedTools: ["read", "write"],
        maxContextLength: 10000,
        supportsStreaming: false,
      },
    };

    registry.register(agent);

    expect(registry.get("agent1")).toEqual(agent);
    expect(registry.getAll()).toHaveLength(1);
  });

  it("should find agents by capability", () => {
    registry.register({
      id: "agent1",
      name: "Reader",
      role: "executor",
      capabilities: {
        canHandleContext: true,
        canExecuteTools: true,
        supportedTools: ["read"],
        maxContextLength: 10000,
        supportsStreaming: false,
      },
    });

    registry.register({
      id: "agent2",
      name: "Writer",
      role: "executor",
      capabilities: {
        canHandleContext: true,
        canExecuteTools: true,
        supportedTools: ["write"],
        maxContextLength: 10000,
        supportsStreaming: false,
      },
    });

    const readers = registry.findByCapability("canExecuteTools");
    expect(readers).toHaveLength(2);
  });
});
