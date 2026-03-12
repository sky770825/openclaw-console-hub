/**
 * Issue Automation Strategy
 * 使用 Strategy Pattern 實作 Issue 相關操作
 */

import {
  ExecutionStrategy,
  ExecutionContext,
  StrategyResult,
  ValidationResult,
} from '../types';
import { GitHubClient } from '../api/GitHubClient';

export class IssueCreateStrategy implements ExecutionStrategy {
  readonly name = 'issue.create';

  validate(params: unknown): ValidationResult {
    const errors: string[] = [];
    const p = params as Record<string, unknown>;

    if (!p.title || typeof p.title !== 'string') {
      errors.push('title is required and must be a string');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const { title, body, labels, assignees } = context.params as {
        title: string;
        body?: string;
        labels?: string[];
        assignees?: string[];
      };

      const issue = await client.createIssue(
        context.owner,
        context.repo,
        title,
        body,
        { labels, assignees }
      );

      return {
        success: true,
        data: {
          issueNumber: issue.number,
          title: issue.title,
          url: `https://github.com/${context.owner}/${context.repo}/issues/${issue.number}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export class IssueListStrategy implements ExecutionStrategy {
  readonly name = 'issue.list';

  validate(params: unknown): ValidationResult {
    const p = params as Record<string, unknown>;
    
    if (p.state && !['open', 'closed', 'all'].includes(p.state as string)) {
      return {
        valid: false,
        errors: ['state must be one of: open, closed, all'],
      };
    }

    return { valid: true };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const { state, labels, assignee, perPage } = context.params as {
        state?: 'open' | 'closed' | 'all';
        labels?: string[];
        assignee?: string;
        perPage?: number;
      };

      const issues = await client.listIssues(context.owner, context.repo, {
        state,
        labels,
        assignee,
        perPage,
      });

      return {
        success: true,
        data: {
          count: issues.length,
          issues: issues.map(i => ({
            number: i.number,
            title: i.title,
            state: i.state,
            labels: i.labels.map(l => l.name),
            assignees: i.assignees.map(a => a.login),
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export class IssueUpdateStrategy implements ExecutionStrategy {
  readonly name = 'issue.update';

  validate(params: unknown): ValidationResult {
    const errors: string[] = [];
    const p = params as Record<string, unknown>;

    if (!p.issueNumber || typeof p.issueNumber !== 'number') {
      errors.push('issueNumber is required and must be a number');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const { issueNumber, title, body, state, labels, assignees } = context.params as {
        issueNumber: number;
        title?: string;
        body?: string;
        state?: 'open' | 'closed';
        labels?: string[];
        assignees?: string[];
      };

      const issue = await client.updateIssue(
        context.owner,
        context.repo,
        issueNumber,
        { title, body, state, labels, assignees }
      );

      return {
        success: true,
        data: {
          issueNumber: issue.number,
          title: issue.title,
          state: issue.state,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}