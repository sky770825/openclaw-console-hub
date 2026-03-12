const { Octokit } = require('@octokit/rest');

class ReleaseManager {
  constructor(config) {
    this.octokit = new Octokit({ auth: config.githubToken });
    this.owner = config.defaultOwner;
    this.repo = config.defaultRepo;
  }

  async create(params) {
    const releaseData = {
      owner: params.owner || this.owner,
      repo: params.repo || this.repo,
      tag_name: params.tagName,
      name: params.name || params.tagName,
      body: params.body,
      draft: params.draft || false,
      prerelease: params.prerelease || false,
      generate_release_notes: params.generateReleaseNotes || false
    };

    if (params.targetCommitish) {
      releaseData.target_commitish = params.targetCommitish;
    }

    const { data } = await this.octokit.rest.repos.createRelease(releaseData);

    return {
      success: true,
      id: data.id,
      tagName: data.tag_name,
      url: data.html_url,
      uploadUrl: data.upload_url
    };
  }
}

module.exports = { ReleaseManager };
