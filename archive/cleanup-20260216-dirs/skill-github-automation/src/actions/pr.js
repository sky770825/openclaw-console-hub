const { Octokit } = require('@octokit/rest');

class PRAnalyzer {
  constructor(config) {
    this.octokit = new Octokit({ auth: config.githubToken });
    this.owner = config.defaultOwner;
    this.repo = config.defaultRepo;
  }

  async basic(params) {
    const { data: pr } = await this.octokit.rest.pulls.get({
      owner: params.owner || this.owner,
      repo: params.repo || this.repo,
      pull_number: params.pullNumber
    });

    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      author: pr.user.login
    };
  }

  async full(params) {
    const basic = await this.basic(params);
    
    const { data: files } = await this.octokit.rest.pulls.listFiles({
      owner: params.owner || this.owner,
      repo: params.repo || this.repo,
      pull_number: params.pullNumber
    });

    const { data: reviews } = await this.octokit.rest.pulls.listReviews({
      owner: params.owner || this.owner,
      repo: params.repo || this.repo,
      pull_number: params.pullNumber
    });

    return {
      ...basic,
      files: files.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions
      })),
      reviewCount: reviews.length,
      reviewStatus: reviews.length > 0 ? 'reviewed' : 'pending'
    };
  }
}

module.exports = { PRAnalyzer };
