/**
 * MCP (Model Context Protocol) Core Module
 * 
 * 實作基於 Model Context Protocol 標準的 Agent 間通訊協議，
 * 支援上下文交換、目標傳遞和工具調用。
 */

import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

// ============================================================================
// MCP Protocol Types
// ============================================================================

export const MCP_PROTOCOL_VERSION = "2025-02-17";

export type MCPMessageType = 
  | "context"
  | "goal"
  | "tool_call"
  | "tool_result"
  | "heartbeat"
  | "status"
  | "error";

export interface MCPMessage {
  id: string;
  type: MCPMessageType;
  from: string;
  to: string;
  timestamp: number;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface MCPContext {
  sessionId: string;
  parentContextId?: string;
  agentId: string;
  role: string;
  content: string;
  attachments?: MCPAttachment[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  expiresAt?: number;
}

export interface MCPAttachment {
  type: "image" | "file" | "text" | "json";
  mimeType: string;
  content: string;
  name?: string;
}

export interface MCPGoal {
  id: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  dependencies?: string[];
  deadline?: number;
  metadata?: Record<string, unknown>;
}

export interface MCPToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  caller: string;
  callee: string;
  timeoutMs?: number;
}

export interface MCPToolResult {
  callId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
  metadata?: Record<string, unknown>;
}

export interface MCPAgentCapabilities {
  canHandleContext: boolean;
  canExecuteTools: boolean;
  supportedTools: string[];
  maxContextLength: number;
  supportsStreaming: boolean;
}

export interface MCPAgent {
  id: string;
  name: string;
  role: string;
  capabilities: MCPAgentCapabilities;
  endpoint?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
 * MCP Protocol Handler
 * ============================================================================

export interface MCPHandler {
  onContext?(context: MCPContext): Promise<void>;
  onGoal?(goal: MCPGoal): Promise<void>;
  onToolCall?(call: MCPToolCall): Promise<MCPToolResult>;
  onHeartbeat?(): Promise<void>;
  onStatus?(): Promise<MCPAgentStatus>;
}

export interface MCPAgentStatus {
  id: string;
  state: "idle" | "busy" | "error";
  currentTask?: string;
  queueSize: number;
  lastHeartbeat: number;
}

// ============================================================================
 * MCP Transport Interface
 * ============================================================================

export interface MCPTransport {
  send(message: MCPMessage): Promise<void>;
  onMessage(handler: (message: MCPMessage) => void): void;
  close(): Promise<void>;
}

// ============================================================================
 * MCP Protocol Implementation
 * ============================================================================

export class MCPProtocol extends EventEmitter {
  private agentId: string;
  private transport: MCPTransport;
  private handler: MCPHandler;
  private pendingCalls = new Map<string, {
    resolve: (result: MCPToolResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private contextStore = new Map<string, MCPContext>();
  private goalStore = new Map<string, MCPGoal>();

  constructor(
    agentId: string,
    transport: MCPTransport,
    handler: MCPHandler
  ) {
    super();
    this.agentId = agentId;
    this.transport = transport;
    this.handler = handler;
    this.setupMessageHandler();
  }

  private setupMessageHandler(): void {
    this.transport.onMessage(async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        this.emit("error", error);
        await this.sendError(message.from, message.id, String(error));
      }
    });
  }

  private async handleMessage(message: MCPMessage): Promise<void> {
    // Check if message is for this agent
    if (message.to !== this.agentId && message.to !== "*") {
      return;
    }

    this.emit("message", message);

    switch (message.type) {
      case "context":
        await this.handleContextMessage(message);
        break;
      case "goal":
        await this.handleGoalMessage(message);
        break;
      case "tool_call":
        await this.handleToolCallMessage(message);
        break;
      case "tool_result":
        await this.handleToolResultMessage(message);
        break;
      case "heartbeat":
        await this.handleHeartbeatMessage(message);
        break;
      case "status":
        await this.handleStatusMessage(message);
        break;
      case "error":
        this.emit("error", message.payload);
        break;
    }
  }

  private async handleContextMessage(message: MCPMessage): Promise<void> {
    const context = message.payload as MCPContext;
    this.contextStore.set(context.sessionId, context);
    
    if (this.handler.onContext) {
      await this.handler.onContext(context);
    }
    
    this.emit("context", context);
  }

  private async handleGoalMessage(message: MCPMessage): Promise<void> {
    const goal = message.payload as MCPGoal;
    this.goalStore.set(goal.id, goal);
    
    if (this.handler.onGoal) {
      await this.handler.onGoal(goal);
    }
    
    this.emit("goal", goal);
  }

  private async handleToolCallMessage(message: MCPMessage): Promise<void> {
    if (!this.handler.onToolCall) {
      await this.sendToolResult(message.from, message.id, {
        callId: message.id,
        success: false,
        error: "Tool execution not supported",
        executionTimeMs: 0,
      });
      return;
    }

    const startTime = Date.now();
    try {
      const call = message.payload as MCPToolCall;
      const result = await this.handler.onToolCall(call);
      result.executionTimeMs = Date.now() - startTime;
      await this.sendToolResult(message.from, message.id, result);
    } catch (error) {
      await this.sendToolResult(message.from, message.id, {
        callId: message.id,
        success: false,
        error: String(error),
        executionTimeMs: Date.now() - startTime,
      });
    }
  }

  private async handleToolResultMessage(message: MCPMessage): Promise<void> {
    const result = message.payload as MCPToolResult;
    const pending = this.pendingCalls.get(result.callId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(result.callId);
      
      if (result.success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(result.error || "Tool execution failed"));
      }
    }
    
    this.emit("toolResult", result);
  }

  private async handleHeartbeatMessage(message: MCPMessage): Promise<void> {
    if (this.handler.onHeartbeat) {
      await this.handler.onHeartbeat();
    }
    this.emit("heartbeat", message.from);
  }

  private async handleStatusMessage(message: MCPMessage): Promise<void> {
    // Status responses are handled by the requester
    this.emit("status", message.payload);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  async sendContext(to: string, context: Omit<MCPContext, "createdAt">): Promise<void> {
    const fullContext: MCPContext = {
      ...context,
      createdAt: Date.now(),
    };
    
    await this.transport.send({
      id: randomUUID(),
      type: "context",
      from: this.agentId,
      to,
      timestamp: Date.now(),
      payload: fullContext,
    });
  }

  async sendGoal(to: string, goal: MCPGoal): Promise<void> {
    this.goalStore.set(goal.id, goal);
    
    await this.transport.send({
      id: randomUUID(),
      type: "goal",
      from: this.agentId,
      to,
      timestamp: Date.now(),
      payload: goal,
    });
  }

  async callTool(
    to: string,
    toolName: string,
    args: Record<string, unknown>,
    timeoutMs = 30000
  ): Promise<MCPToolResult> {
    const callId = randomUUID();
    const call: MCPToolCall = {
      id: callId,
      toolName,
      arguments: args,
      caller: this.agentId,
      callee: to,
      timeoutMs,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(callId);
        reject(new Error(`Tool call timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingCalls.set(callId, { resolve, reject, timeout });

      this.transport.send({
        id: callId,
        type: "tool_call",
        from: this.agentId,
        to,
        timestamp: Date.now(),
        payload: call,
      }).catch((error) => {
        clearTimeout(timeout);
        this.pendingCalls.delete(callId);
        reject(error);
      });
    });
  }

  private async sendToolResult(
    to: string,
    callId: string,
    result: MCPToolResult
  ): Promise<void> {
    await this.transport.send({
      id: randomUUID(),
      type: "tool_result",
      from: this.agentId,
      to,
      timestamp: Date.now(),
      payload: result,
      metadata: { callId },
    });
  }

  private async sendError(to: string, replyTo: string, error: string): Promise<void> {
    await this.transport.send({
      id: randomUUID(),
      type: "error",
      from: this.agentId,
      to,
      timestamp: Date.now(),
      payload: { error, replyTo },
    });
  }

  async sendHeartbeat(to: string): Promise<void> {
    await this.transport.send({
      id: randomUUID(),
      type: "heartbeat",
      from: this.agentId,
      to,
      timestamp: Date.now(),
      payload: {},
    });
  }

  async requestStatus(to: string): Promise<void> {
    await this.transport.send({
      id: randomUUID(),
      type: "status",
      from: this.agentId,
      to,
      timestamp: Date.now(),
      payload: {},
    });
  }

  getContext(sessionId: string): MCPContext | undefined {
    return this.contextStore.get(sessionId);
  }

  getGoal(goalId: string): MCPGoal | undefined {
    return this.goalStore.get(goalId);
  }

  getAllContexts(): MCPContext[] {
    return Array.from(this.contextStore.values());
  }

  getAllGoals(): MCPGoal[] {
    return Array.from(this.goalStore.values());
  }

  clearContext(sessionId: string): boolean {
    return this.contextStore.delete(sessionId);
  }

  clearGoal(goalId: string): boolean {
    return this.goalStore.delete(goalId);
  }

  async close(): Promise<void> {
    // Clear all pending calls
    for (const [callId, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("MCP protocol closed"));
    }
    this.pendingCalls.clear();
    
    await this.transport.close();
    this.removeAllListeners();
  }
}

// ============================================================================
 * In-Memory Transport (for testing and local coordination)
 * ============================================================================

export class MCPInMemoryTransport implements MCPTransport {
  private handler?: (message: MCPMessage) => void;
  private static brokers = new Map<string, MCPInMemoryTransport>();

  constructor(public readonly agentId: string) {
    MCPInMemoryTransport.brokers.set(agentId, this);
  }

  async send(message: MCPMessage): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1));
    
    if (message.to === "*") {
      // Broadcast to all agents
      for (const [agentId, transport] of MCPInMemoryTransport.brokers) {
        if (agentId !== message.from && transport.handler) {
          transport.handler(message);
        }
      }
    } else {
      // Direct message
      const target = MCPInMemoryTransport.brokers.get(message.to);
      if (target?.handler) {
        target.handler(message);
      }
    }
  }

  onMessage(handler: (message: MCPMessage) => void): void {
    this.handler = handler;
  }

  async close(): Promise<void> {
    MCPInMemoryTransport.brokers.delete(this.agentId);
  }

  static reset(): void {
    MCPInMemoryTransport.brokers.clear();
  }
}

// ============================================================================
 * MCP Agent Registry
 * ============================================================================

export class MCPAgentRegistry {
  private agents = new Map<string, MCPAgent>();
  private emitter = new EventEmitter();

  register(agent: MCPAgent): void {
    this.agents.set(agent.id, agent);
    this.emitter.emit("registered", agent);
  }

  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.emitter.emit("unregistered", agent);
      return true;
    }
    return false;
  }

  get(agentId: string): MCPAgent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): MCPAgent[] {
    return Array.from(this.agents.values());
  }

  findByRole(role: string): MCPAgent[] {
    return this.getAll().filter((agent) => agent.role === role);
  }

  findByCapability(capability: keyof MCPAgentCapabilities): MCPAgent[] {
    return this.getAll().filter((agent) => agent.capabilities[capability]);
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }
}

// Export singleton registry
export const mcpRegistry = new MCPAgentRegistry();
