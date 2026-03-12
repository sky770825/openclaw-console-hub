class SkillConfigBuilder {
  constructor() {
    this.config = {
      githubToken: null,
      licenseKey: null,
      defaultOwner: null,
      defaultRepo: null,
      features: {
        issue: true,
        pr: true,
        release: false,
        analytics: false
      }
    };
  }

  setGitHubToken(token) {
    this.config.githubToken = token;
    return this;
  }

  setLicenseKey(key) {
    this.config.licenseKey = key;
    return this;
  }

  setDefaultOwner(owner) {
    this.config.defaultOwner = owner;
    return this;
  }

  setDefaultRepo(repo) {
    this.config.defaultRepo = repo;
    return this;
  }

  enableAllFeatures() {
    this.config.features = {
      issue: true,
      pr: true,
      release: true,
      analytics: true
    };
    return this;
  }

  build() {
    if (!this.config.githubToken) {
      throw new Error('GitHub token is required');
    }
    if (!this.config.licenseKey) {
      throw new Error('License key is required');
    }
    return this.config;
  }
}

module.exports = { SkillConfigBuilder };
