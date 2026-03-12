/**
 * GitHub API Client
 * 封裝 Octokit REST API，提供統一介面
 */

import { Octokit } from '@octokit/rest';
import {
  GitHubIssue,
  GitHubPullRequest,
  GitHubRelease,
  RepoStats,
} from '../types';

export class GitHubClient {
  private octokit: Octokit;
  private _token: string;

  constructor(token: string) {
    this._token = token;
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * 取得目前使用的 GitHub Token（部分遮蔽）
   */
  getToken(): string {
    return this._token.substring(0, 4) + '****' + this._token.substring(this._token.length - 4);
  }

  // ============================================================================
  // Issue Operations
  // ============================================================================

  async listIssues(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      labels?: string[];
      assignee?: string;
      perPage?: number;
    } = {}
  ): Promise<GitHubIssue[]> {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: options.state || 'open',
      labels: options.labels?.join(','),
      assignee: options.assignee,
      per_page: options.perPage || 30,
    });

    return data.map(this.mapIssue);
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body?: string,
    options: {
      labels?: string[];
      assignees?: string[];
    } = {}
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: options.labels,
      assignees: options.assignees,
    });

    return this.mapIssue(data);
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...updates,
    });

    return this.mapIssue(data);
  }

  // ============================================================================
  // Pull Request Operations
  // ============================================================================

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubPullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return this.mapPullRequest(data);
  }

  async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      perPage?: number;
    } = {}
  ): Promise<GitHubPullRequest[]> {
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: options.state || 'open',
      per_page: options.perPage || 30,
    });

    return data.map(this.mapPullRequest);
  }

  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{ filename: string; status: string; changes: number }>> {
    const { data } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return data.map(f => ({
      filename: f.filename,
      status: f.status,
      changes: f.changes,
    }));
  }

  // ============================================================================
  // Release Operations
  // ============================================================================

  async createRelease(
    owner: string,
    repo: string,
    tagName: string,
    options: {
      name?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
      targetCommitish?: string;
    } = {}
  ): Promise<GitHubRelease> {
    const { data } = await this.octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: options.name,
      body: options.body,
      draft: options.draft,
      prerelease: options.prerelease,
      target_commitish: options.targetCommitish,
    });

    return this.mapRelease(data);
  }

  async generateReleaseNotes(
    owner: string,
    repo: string,
    tagName: string,
    previousTag?: string
  ): Promise<string> {
    const { data } = await this.octokit.rest.repos.generateReleaseNotes({
      owner,
      repo,
      tag_name: tagName,
      previous_tag_name: previousTag,
    });

    return data.body;
  }

  // ============================================================================
  // Repository Analytics
  // ============================================================================

  async getRepoStats(owner: string, repo: string): Promise<RepoStats> {
    const [{ data: repoData }, { data: issues }, { data: pulls }] = await Promise.all([
      this.octokit.rest.repos.get({ owner, repo }),
      this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 1,
      }),
      this.octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 1,
      }),
    ]);

    // 計算健康度分數 (0-100)
    const healthScore = this.calculateHealthScore(repoData, issues.length);

    return {
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: issues.length,
      openPRs: pulls.length,
      watchers: repoData.watchers_count,
      healthScore,
    };
  }

  // ============================================================================
  // Rate Limit
  // ============================================================================

  async getRateLimit(): Promise<{ limit: number; remaining: number; resetAt: Date }> {
    const { data } = await this.octokit.rest.rateLimit.get();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      resetAt: new Date(data.rate.reset * 1000),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapIssue(data: any): GitHubIssue {
    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state as 'open' | 'closed',
      labels: data.labels.map((l: any) => ({ name: l.name })),
      assignees: data.assignees.map((a: any) => ({ login: a.login })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapPullRequest(data: any): GitHubPullRequest {
    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state as 'open' | 'closed',
      user: { login: data.user.login },
      head: { ref: data.head.ref, sha: data.head.sha },
      base: { ref: data.base.ref, sha: data.base.sha },
      changedFiles: data.changed_files,
      additions: data.additions,
      deletions: data.deletions,
    };
  }

  private mapRelease(data: any): GitHubRelease {
    return {
      id: data.id,
      tagName: data.tag_name,
      name: data.name,
      body: data.body,
      draft: data.draft,
      prerelease: data.prerelease,
      createdAt: data.created_at,
      publishedAt: data.published_at,
    };
  }

  private calculateHealthScore(repoData: any, openIssues: number): number {
    // 簡化的健康度計算
    let score = 70; // 基礎分

    // 有 README 加分
    if (repoData.description && repoData.description.length > 20) score += 10;
    
    // 問題比例評估
    const issueRatio = openIssues / (repoData.stargazers_count + 1);
    if (issueRatio < 0.01) score += 10;
    else if (issueRatio > 0.1) score -= 10;

    // 最近更新
    const lastUpdate = new Date(repoData.updated_at);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 10;
    else if (daysSinceUpdate > 180) score -= 10;

    return Math.min(100, Math.max(0, score));
  }
}