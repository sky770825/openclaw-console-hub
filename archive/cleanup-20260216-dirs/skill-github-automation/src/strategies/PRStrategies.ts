/**
 * Pull Request Assistant Strategy
 * PR 審查輔助功能
 */

import {
  ExecutionStrategy,
  ExecutionContext,
  StrategyResult,
  ValidationResult,
} from '../types';
import { GitHubClient } from '../api/GitHubClient';

export class PRAnalyzeStrategy implements ExecutionStrategy {
  readonly name = 'pr.analyze';

  validate(params: unknown): ValidationResult {
    const errors: string[] = [];
    const p = params as Record<string, unknown>;

    if (!p.pullNumber || typeof p.pullNumber !== 'number') {
      errors.push('pullNumber is required and must be a number');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const { pullNumber } = context.params as { pullNumber: number };

      const [pr, files] = await Promise.all([
        client.getPullRequest(context.owner, context.repo, pullNumber),
        client.getPullRequestFiles(context.owner, context.repo, pullNumber),
      ]);

      // 產生分析摘要
      const analysis = this.analyzePR(pr, files);

      return {
        success: true,
        data: {
          pullNumber: pr.number,
          title: pr.title,
          author: pr.user.login,
          stats: {
            files: pr.changedFiles,
            additions: pr.additions,
            deletions: pr.deletions,
          },
          analysis,
          fileChanges: files,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private analyzePR(
    pr: { additions: number; deletions: number; changedFiles: number },
    files: Array<{ filename: string; status: string }>
  ): {
    size: 'small' | 'medium' | 'large';
    risk: 'low' | 'medium' | 'high';
    suggestions: string[];
  } {
    const totalChanges = pr.additions + pr.deletions;
    let size: 'small' | 'medium' | 'large';
    let risk: 'low' | 'medium' | 'high';
    const suggestions: string[] = [];

    // 大小評估
    if (totalChanges < 50) size = 'small';
    else if (totalChanges < 300) size = 'medium';
    else size = 'large';

    // 風險評估
    const hasTestFiles = files.some(f => 
      f.filename.includes('.test.') || 
      f.filename.includes('.spec.') ||
      f.filename.includes('/tests/')
    );
    
    const hasConfigChanges = files.some(f =>
      f.filename.includes('package.json') ||
      f.filename.includes('tsconfig') ||
      f.filename.includes('.env')
    );

    if (hasConfigChanges) risk = 'high';
    else if (!hasTestFiles && totalChanges > 100) risk = 'medium';
    else risk = 'low';

    // 建議
    if (size === 'large') {
      suggestions.push('建議拆分為較小的 PR，更容易審查');
    }
    if (!hasTestFiles) {
      suggestions.push('建議添加相關測試');
    }
    if (pr.changedFiles > 10) {
      suggestions.push('變更檔案較多，請確保變更範圍聚焦');
    }

    return { size, risk, suggestions };
  }
}

export class PRReviewStrategy implements ExecutionStrategy {
  readonly name = 'pr.review';

  validate(params: unknown): ValidationResult {
    const errors: string[] = [];
    const p = params as Record<string, unknown>;

    if (!p.pullNumber || typeof p.pullNumber !== 'number') {
      errors.push('pullNumber is required and must be a number');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const { pullNumber, checkList } = context.params as {
        pullNumber: number;
        checkList?: string[];
      };

      const pr = await client.getPullRequest(context.owner, context.repo, pullNumber);
      const files = await client.getPullRequestFiles(context.owner, context.repo, pullNumber);

      // 產生審查清單
      const defaultCheckList = [
        '程式碼邏輯正確',
        '命名清晰有意義',
        '無明顯效能問題',
        '錯誤處理完整',
        '文件已更新',
      ];

      const reviewCheckList = checkList || defaultCheckList;

      return {
        success: true,
        data: {
          pullNumber: pr.number,
          title: pr.title,
          reviewTemplate: {
            summary: `PR #${pullNumber}: ${pr.title}`,
            changes: {
              files: pr.changedFiles,
              additions: pr.additions,
              deletions: pr.deletions,
            },
            checkList: reviewCheckList.map(item => ({
              item,
              checked: false,
            })),
            fileSummary: files.map(f => ({
              file: f.filename,
              changes: f.changes,
              status: f.status,
            })),
          },
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