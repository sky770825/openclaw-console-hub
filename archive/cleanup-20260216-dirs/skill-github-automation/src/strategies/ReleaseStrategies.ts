/**
 * Release Automation Strategy
 * 自動化發布功能
 */

import {
  ExecutionStrategy,
  ExecutionContext,
  StrategyResult,
  ValidationResult,
} from '../types';
import { GitHubClient } from '../api/GitHubClient';

export class ReleaseCreateStrategy implements ExecutionStrategy {
  readonly name = 'release.create';

  validate(params: unknown): ValidationResult {
    const errors: string[] = [];
    const p = params as Record<string, unknown>;

    if (!p.tagName || typeof p.tagName !== 'string') {
      errors.push('tagName is required and must be a string (e.g., "v1.0.0")');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const {
        tagName,
        name,
        body,
        generateNotes,
        draft,
        prerelease,
        targetCommitish,
      } = context.params as {
        tagName: string;
        name?: string;
        body?: string;
        generateNotes?: boolean;
        draft?: boolean;
        prerelease?: boolean;
        targetCommitish?: string;
      };

      let releaseBody = body;

      // 自動產生 release notes
      if (generateNotes && !body) {
        releaseBody = await client.generateReleaseNotes(
          context.owner,
          context.repo,
          tagName
        );
      }

      const release = await client.createRelease(
        context.owner,
        context.repo,
        tagName,
        {
          name: name || tagName,
          body: releaseBody,
          draft,
          prerelease,
          targetCommitish,
        }
      );

      return {
        success: true,
        data: {
          releaseId: release.id,
          tagName: release.tagName,
          name: release.name,
          url: `https://github.com/${context.owner}/${context.repo}/releases/tag/${release.tagName}`,
          published: !release.draft,
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

export class RepoStatsStrategy implements ExecutionStrategy {
  readonly name = 'repo.stats';

  validate(): ValidationResult {
    // 不需要參數
    return { valid: true };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const stats = await client.getRepoStats(context.owner, context.repo);
      const rateLimit = await client.getRateLimit();

      return {
        success: true,
        data: {
          repository: `${context.owner}/${context.repo}`,
          stats,
          rateLimit: {
            remaining: rateLimit.remaining,
            limit: rateLimit.limit,
            resetAt: rateLimit.resetAt.toISOString(),
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

export class RepoHealthStrategy implements ExecutionStrategy {
  readonly name = 'repo.health';

  validate(): ValidationResult {
    return { valid: true };
  }

  async execute(context: ExecutionContext): Promise<StrategyResult> {
    try {
      const client = new GitHubClient(context.githubToken);
      const stats = await client.getRepoStats(context.owner, context.repo);

      // 健康度評估
      const health = this.assessHealth(stats);

      return {
        success: true,
        data: {
          repository: `${context.owner}/${context.repo}`,
          healthScore: stats.healthScore,
          assessment: health,
          recommendations: this.generateRecommendations(stats, health),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private assessHealth(stats: { healthScore: number }): {
    status: 'healthy' | 'moderate' | 'needs-attention';
    details: string[];
  } {
    const details: string[] = [];
    let status: 'healthy' | 'moderate' | 'needs-attention';

    if (stats.healthScore >= 80) {
      status = 'healthy';
      details.push('專案維護良好');
    } else if (stats.healthScore >= 60) {
      status = 'moderate';
      details.push('專案狀況尚可，有改善空間');
    } else {
      status = 'needs-attention';
      details.push('專案需要關注和維護');
    }

    return { status, details };
  }

  private generateRecommendations(
    stats: { openIssues: number; stars: number; forks: number },
    health: { status: string }
  ): string[] {
    const recommendations: string[] = [];

    if (health.status !== 'healthy') {
      recommendations.push('定期更新依賴套件');
      recommendations.push('檢視並處理過期的 Issues');
    }

    if (stats.openIssues > 50) {
      recommendations.push('考慮標籤分類管理 Issues');
    }

    if (stats.stars > 100 && stats.forks < 10) {
      recommendations.push('添加貢獻指南 (CONTRIBUTING.md) 鼓勵參與');
    }

    return recommendations;
  }
}