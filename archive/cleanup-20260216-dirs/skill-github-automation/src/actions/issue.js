const { Octokit } = require('@octokit/rest');

class IssueAutomation {
  constructor(config) {
    this.octokit = new Octokit({ auth: config.githubToken });
    this.owner = config.defaultOwner;
    this.repo = config.defaultRepo;
  }

  async create(params) {
    const { data } = await this.octokit.rest.issues.create({
      owner: params.owner || this.owner,
      repo: params.repo || this.repo,
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignees,
      milestone: params.milestone
    });
    return { success: true, issueNumber: data.number, url: data.html_url };
  }

  async list(params) {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner: params.owner || this.owner,
      repo: params.repo || this.repo,
      state: params.state || 'open',
      labels: params.labels?.join(','),
      assignee: params.assignee,
      per_page: params.limit || 30
    });
    return data.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map(l => l.name),
      url: issue.html_url
    }));
  }
}

module.exports = { IssueAutomation };
