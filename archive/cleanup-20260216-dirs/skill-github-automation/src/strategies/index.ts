/**
 * Strategy Registry
 * 統一管理所有執行策略
 */

import { ExecutionStrategy } from '../types';
import {
  IssueCreateStrategy,
  IssueListStrategy,
  IssueUpdateStrategy,
} from './IssueStrategies';
import {
  PRAnalyzeStrategy,
  PRReviewStrategy,
} from './PRStrategies';
import {
  ReleaseCreateStrategy,
  RepoStatsStrategy,
  RepoHealthStrategy,
} from './ReleaseStrategies';

export class StrategyRegistry {
  private strategies = new Map<string, ExecutionStrategy>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // Issue 策略
    this.register(new IssueCreateStrategy());
    this.register(new IssueListStrategy());
    this.register(new IssueUpdateStrategy());

    // PR 策略
    this.register(new PRAnalyzeStrategy());
    this.register(new PRReviewStrategy());

    // Release & Repo 策略
    this.register(new ReleaseCreateStrategy());
    this.register(new RepoStatsStrategy());
    this.register(new RepoHealthStrategy());
  }

  register(strategy: ExecutionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): ExecutionStrategy | undefined {
    return this.strategies.get(name);
  }

  list(): string[] {
    return Array.from(this.strategies.keys());
  }

  has(name: string): boolean {
    return this.strategies.has(name);
  }
}
