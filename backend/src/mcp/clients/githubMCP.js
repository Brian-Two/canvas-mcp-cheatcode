// GitHub MCP Client for ASTAR
import { Octokit } from '@octokit/rest';

export class GitHubMCPClient {
  constructor(token) {
    this.token = token;
    this.octokit = new Octokit({
      auth: token,
    });
  }

  // Test connection
  async testConnection() {
    try {
      const { data } = await this.octokit.users.getAuthenticated();
      return {
        success: true,
        user: data.login,
        name: data.name,
        email: data.email,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create Repository
  async createRepository(options) {
    try {
      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name: options.name,
        description: options.description || '',
        private: options.private || false,
        auto_init: options.autoInit !== false, // Default to true
        gitignore_template: options.gitignoreTemplate,
        license_template: options.licenseTemplate,
      });

      return {
        success: true,
        repo: {
          name: data.name,
          full_name: data.full_name,
          html_url: data.html_url,
          clone_url: data.clone_url,
          ssh_url: data.ssh_url,
          default_branch: data.default_branch,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // List User Repositories
  async listRepositories(options = {}) {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: options.sort || 'updated',
        per_page: options.perPage || 30,
        page: options.page || 1,
      });

      return {
        success: true,
        repos: data.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          private: repo.private,
          default_branch: repo.default_branch,
          updated_at: repo.updated_at,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get Repository
  async getRepository(owner, repo) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return {
        success: true,
        repo: {
          name: data.name,
          full_name: data.full_name,
          description: data.description,
          html_url: data.html_url,
          default_branch: data.default_branch,
          created_at: data.created_at,
          updated_at: data.updated_at,
          size: data.size,
          language: data.language,
          topics: data.topics,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create File
  async createFile(owner, repo, path, content, message, branch = null) {
    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: message || `Create ${path}`,
        content: Buffer.from(content).toString('base64'),
        branch,
      });

      return {
        success: true,
        commit: {
          sha: data.commit.sha,
          html_url: data.commit.html_url,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update File
  async updateFile(owner, repo, path, content, message, sha, branch = null) {
    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: message || `Update ${path}`,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      });

      return {
        success: true,
        commit: {
          sha: data.commit.sha,
          html_url: data.commit.html_url,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get File Content
  async getFileContent(owner, repo, path, branch = null) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      // Handle file vs directory
      if (Array.isArray(data)) {
        return {
          success: true,
          type: 'directory',
          contents: data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            url: item.html_url,
          })),
        };
      }

      // Single file
      const content = data.encoding === 'base64' 
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content;

      return {
        success: true,
        type: 'file',
        file: {
          name: data.name,
          path: data.path,
          content: content,
          sha: data.sha,
          size: data.size,
          url: data.html_url,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create Issue
  async createIssue(owner, repo, title, body, labels = []) {
    try {
      const { data } = await this.octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
      });

      return {
        success: true,
        issue: {
          number: data.number,
          title: data.title,
          html_url: data.html_url,
          state: data.state,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // List Issues
  async listIssues(owner, repo, state = 'open') {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state,
      });

      return {
        success: true,
        issues: data.map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          html_url: issue.html_url,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create Branch
  async createBranch(owner, repo, branch, fromBranch = 'main') {
    try {
      // Get the SHA of the branch we're branching from
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      // Create new branch
      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: ref.object.sha,
      });

      return {
        success: true,
        branch: {
          name: branch,
          ref: data.ref,
          sha: data.object.sha,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create Pull Request
  async createPullRequest(owner, repo, title, head, base, body = '') {
    try {
      const { data } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
      });

      return {
        success: true,
        pull_request: {
          number: data.number,
          title: data.title,
          html_url: data.html_url,
          state: data.state,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Search Repositories
  async searchRepositories(query, options = {}) {
    try {
      const { data } = await this.octokit.search.repos({
        q: query,
        sort: options.sort || 'stars',
        order: options.order || 'desc',
        per_page: options.perPage || 30,
      });

      return {
        success: true,
        total_count: data.total_count,
        repos: data.items.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          stars: repo.stargazers_count,
          language: repo.language,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance creator
export const createGitHubClient = (token) => {
  return new GitHubMCPClient(token);
};



