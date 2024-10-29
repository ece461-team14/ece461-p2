// metric_score.ts
// Description: Contains functions to fetch data from GitHub and NPM, 
//              calculate various metrics, and return a comprehensive net score.
// Date: October 29, 2024
// Dependencies: buffer, logger.js, types/GitHubFile.js, Node.js, GitHub API, NPM API
// Contributors: (add contributors)

import { info, debug, silent } from "./logger.js";
import { GitHubFile } from "./types/GitHubFile.js"
import { File } from "buffer";

// Function to calculate score and latency for each metric
const measureLatency = async (fn: () => Promise<any>, label: string) => {
  const start = Date.now();
  const score = await fn();
  const latency = Date.now() - start;
  return { score, latency, label };
};

// takes as input URL and returns a score
export async function netScore(url: string): Promise<any> {
  let data, openIssues, closedIssues;

  // convert npm URL to GitHub URL
  if (url.includes("npmjs.com")) {
    try {
      // Extract the package name from the URL
      const packagePath = url.split("npmjs.com/package/")[1];
      if (!packagePath) {
        throw new Error("Invalid npm URL");
      }

      const apiUrl = `https://registry.npmjs.org/${packagePath}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`npm API error: ${response.statusText}`);
      }
      const repoURL = await response.json();

      const repo: string = repoURL ? repoURL.repository.url : null;

      if (!repo) {
        await info("No repository URL found in npm data");
        return JSON.stringify({ mainScore: -1 });
      }

      // Update to Github URL
      url = repo.replace("git+", "").replace(".git", "");
    } catch (err) {
      await info("Error fetching npm data");
      throw new Error("Error fetching npm data");
    }
  }

  try {
    data = await fetchGitHubData(url);
    [openIssues, closedIssues] = await fetchIssues(url);
  } catch (err) {
    await info("Error fetching GitHub data");
    throw new Error("Error fetching GitHub data");
  }

  // structure for getting count (for bus factor) below
  let count; // how many people are contributing to the repo (for bus factor)
  if (data.contributors_count || data.maintainers) {
    // contributors for github and maintainers for npm
    try {
      if (data.contributors_count) {
        const contributors = await fetchCollaboratorsCount(
          data.contributors_count
        ); // have to process the contributors url for GitHub
        count = contributors.length;
      } else {
        count = data.maintainers;
      }
    } catch (err) {
      await info("Error fetching contributors/maintainers");
      throw new Error("Error fetching contributors/maintainers");
    }
  } else {
    await info("No contributor or maintainer data available");
    throw new Error("No contributor or maintainer data available");
  }

  // Get files from repo
  let files: File[];
  try {
    files = await fetchRepoContents(url);
  } catch (error) {
    await info("Error fetching repository contents for ramp-up score");
    return 0; // Default to 0 if there's an error
  }

  // Calculate all metrics in parallel
  const [BusFactor, Correctness, RampUp, ResponsiveMaintainer, License, Dependency, Review] =
    await Promise.all([
      measureLatency(() => busFactorScore(count), "BusFactor"), // Bus Factor Score
      measureLatency(() => correctnessScore(data.issues), "Correctness"), // Correctness Score
      measureLatency(() => rampUpScore(url, files), "RampUp"), // Ramp Up Score
      measureLatency(
        () => responsivenessScore(openIssues, closedIssues),
        "ResponsiveMaintainer"
      ), // Responsiveness Score
      measureLatency(() => licenseScore(data), "License"), // License Score
      measureLatency(() => dependencyScore(files), "Dependency"), // Dependency Score
      measureLatency(() => reviewScore(url), "Review"), // Review Score
    ]);

  // store weights
  let w_b: number = 0.2;
  let w_c: number = 0.25;
  let w_r: number = 0.15;
  let w_rm: number = 0.3;
  let w_l: number = 0.1;
  let weight_dependency: number = 0.1;
  let weight_review: number = 0.1;

  // calculate score
  let netScore: number =
    w_b * BusFactor.score +
    w_c * Correctness.score +
    w_r * RampUp.score +
    w_rm * ResponsiveMaintainer.score +
    w_l * License.score +
    weight_dependency * Dependency.score +
    weight_review * Review.score;
  netScore = parseFloat(netScore.toFixed(2));

  // construct result object, JSONify, then return
  const result = {
    NetScore: netScore,
    RampUp: RampUp.score,
    Correctness: Correctness.score,
    BusFactor: BusFactor.score,
    ResponsiveMaintainer: ResponsiveMaintainer.score,
    License: License.score,
    Dependency: Dependency.score,
    Review: Review.score,
    RampUp_Latency: RampUp.latency,
    Correctness_Latency: Correctness.latency,
    BusFactor_Latency: BusFactor.latency,
    ResponsiveMaintainer_Latency: ResponsiveMaintainer.latency,
    License_Latency: License.latency,
    Dependency_Latency: Dependency.latency,
    Review_Latency: Review.latency,
  };

  await info(`Processed URL: ${url}, Score: ${netScore}`);
  await info(`Result: ${JSON.stringify(result)}`);
  return result;
}

// analyzes bus factor and returns M_b(r) as specified
// in project plan
export async function busFactorScore(
  contributorsCount: number
): Promise<number> {
  let busFactorScore;

  // each comparison is to a number of contributors that has ranges of safe,moderate, low, and very low
  if (contributorsCount >= 10) {
    busFactorScore = 10;
  } else if (contributorsCount >= 5) {
    busFactorScore = 7;
  } else if (contributorsCount >= 2) {
    busFactorScore = 4;
  } else {
    busFactorScore = 1;
  }

  // return normalized score
  return busFactorScore / 10;
}

// analyzes reliability/quality of codebase
// and returns M_c,normalized(r) as specified in project plan
export async function correctnessScore(IssueCount: number): Promise<number> {
  if (IssueCount === undefined || IssueCount === null) {
    await info("Issue count is missing, returning correctness score of 0");
    return 0; // No issue count present, return 0
  }

  // If there are 0 issues, return a perfect score of 1
  if (IssueCount === 0) {
    return 1;
  }

  const correctness = 1 / (1 + Math.log(1 + IssueCount));

  return parseFloat(correctness.toFixed(2));
}

// analyzes presence and completness of relevant documentation
// for new developers and return M_r(r) as specified in project plan
export async function rampUpScore(repoUrl: string, files: File[]): Promise<number> {
  let documentationScore = 0;
  let organizationScore = 0;
  let setupScore = 0;
  let testScore = 0;
  let ciCdScore = 0;

  // Here check for the presence of common files and directories, we can expand on this...
  // Check for README.md
  const readmeExists = files.some(
    (file: File) => file.name.toLowerCase() === "readme.md"
  ); // Changed `any` to `File`
  if (readmeExists) {
    documentationScore += 1;
  }

  // Check for CONTRIBUTING.md
  const contributingExists = files.some(
    (file: File) => file.name.toLowerCase() === "contributing.md"
  ); // Changed `any` to `File`
  if (contributingExists) {
    documentationScore += 1;
  }

  // Check for src/ and test/ directories
  const srcExists = files.some(
    (file: File) => file.type === "dir" && file.name.toLowerCase() === "src"
  ); // Changed `any` to `File`
  const testExists = files.some(
    (file: File) => file.type === "dir" && file.name.toLowerCase() === "test"
  ); // Changed `any` to `File`
  if (srcExists) organizationScore += 1;
  if (testExists) organizationScore += 1;

  // Check for package.json, requirements.txt, or similar
  const setupFiles = [
    "package.json",
    "requirements.txt",
    "build.gradle",
    "pom.xml",
  ];
  const setupFileExists = files.some((file: File) =>
    setupFiles.includes(file.name.toLowerCase())
  ); // Changed `any` to `File`
  if (setupFileExists) {
    setupScore += 1;
  }

  // Check for CI/CD config files like .travis.yml, .github/workflows/ci.yml, etc.
  const ciCdFiles = [
    ".travis.yml",
    ".circleci/config.yml",
    ".github/workflows/ci.yml",
  ];
  const ciCdFileExists = files.some((file: File) =>
    ciCdFiles.includes(file.name.toLowerCase())
  ); // Changed `any` to `File`
  if (ciCdFileExists) {
    ciCdScore += 1;
  }

  // Total score calculation
  const totalScore =
    documentationScore +
    organizationScore +
    setupScore +
    testScore +
    ciCdScore;
  const maxPossibleScore = 8;
  const normalizedScore = totalScore / maxPossibleScore; // normalize

  return normalizedScore;
}

// Measures issue activity and frequency of closing issues
// and returns M_rm,normalized(r) as specified in project plan
export async function responsivenessScore(
  openIssues,
  closedIssues
): Promise<number> {
  let numOpenIssues = openIssues.length;
  let numClosedIssues = closedIssues.length;

  let score =
    numClosedIssues / numOpenIssues > 1 ? 1 : numClosedIssues / numOpenIssues;
  return score ? score : 0;
}

export async function licenseScore(data: any): Promise<number> {
  // List of licenses that are compatible with LGPL 2.0
  const compatibleLicenses = [
    "GNU General Public License v2.0",
    "GNU General Public License v3.0",
    "GNU Lesser General Public License v2.1",
    "GNU Lesser General Public License v3.0",
    "MIT License",
    "ISC License",
  ];

  // Check if the license exists and if it is compatible with LGPL 2.1
  if (data.license && compatibleLicenses.includes(data.license)) {
    return 1; // License is present and compatible
  }

  return 0; // No compatible license found
}

/**
 * DependencyScore: Calculate the fraction of dependencies pinned to a major+minor version
 * 
 * @param files - Array of files from the repository
 * @returns number - Fraction of dependencies with major+minor version pinning
 */
async function dependencyScore(files: File[]): Promise<number> {
  // Find package.json in the files array
  try {
    const packageJsonFile: GitHubFile = files.find(file => file.name === 'package.json') as unknown as GitHubFile;

    if (!packageJsonFile) { // NOTE: May need to return 1.0 b/c there are no dependencies technically, spec unclear
      console.log('NO PACKAGE.JSON');
      await info("Error checking package.json: file does not exist");
      throw new Error("Could not read package.json");
    }
    const packageJsonDownload = await fetch(packageJsonFile.download_url);
    if (!packageJsonDownload.ok) {
      await info("Error checking package.json: error in file download");
      throw new Error(`Error fetching file: ${packageJsonDownload.statusText}`);
    }
    const packageJsonData = await packageJsonDownload.text();

    // Read and parse package.json file
    const packageJson = JSON.parse(packageJsonData);
    const dependencies = packageJson.dependencies || {};

    if (Object.keys(dependencies).length === 0) return 1.0; // No dependencies, score is 1.0

    // Check if each dependency is pinned to a major+minor version
    const pinnedDependencies = Object.values(dependencies).filter((version: string) => {
      const versionParts = version.match(/^(\d+)\.(\d+)\.(x|\d+)$/); // Matches major.minor.x or major.minor.patch
      return versionParts && versionParts[1] && versionParts[2];
    });

    return pinnedDependencies.length / Object.keys(dependencies).length;
  } catch (error) {
    console.error(error);
    await info("Error checking package.json: file read error");
    throw new Error("Could not read package.json");
  }
}

/**
 * ReviewScore: Calculate the fraction of project code introduced through reviewed pull requests
 * 
 * @param owner - Owner of the repository
 * @param repo - Repository name
 * @returns Promise<number> - Fraction of code introduced with code review
 */
async function reviewScore(repoUrl: string): Promise<number> {
  try {
    // Fetch the last 100 closed pull requests (modify as needed)
    // Build query URLs
    const repoPath = repoUrl.split("github.com/")[1];
    if (!repoPath) {
      throw new Error("Invalid GitHub URL");
    }

    // Ensure the repository path is in the format 'owner/repo'
    const [owner, repo] = repoPath.split("/").map((part) => part.trim());
    if (!owner || !repo) {
      throw new Error("Invalid GitHub repository path");
    }

    // Construct the GitHub API URLs for opened and close and still open issues
    const closedPRUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=100`;
    const prResponse = await fetch(closedPRUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    const pulls = await prResponse.json();

    if (pulls.length === 0) return 1.0; // No pull requests, assume all code is introduced with review

    let reviewedCount = 0;

    // Check if each PR has at least one review
    for (const pull of pulls) {
      const reviewsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull.number}/reviews`;
      const reviewsResponse = await fetch(reviewsUrl, {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      });

      const reviews = await reviewsResponse.json();

      // If there is at least one review, consider this PR as reviewed
      if (reviews.length > 0) reviewedCount++;
    }

    return reviewedCount / pulls.length;
  } catch (error) {
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Define a function to fetch data from the GitHub API
export async function fetchGitHubData(url: string) {
  // Extract the repository owner and name from the URL
  const repoPath = url.split("github.com/")[1];
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }

  // Ensure the repository path is in the format 'owner/repo'
  const [owner, repo] = repoPath.split("/").map((part) => part.trim());
  if (!owner || !repo) {
    throw new Error("Invalid GitHub repository path");
  }

  // Get the GitHub token from the environment
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is not set in the environment");
    process.exit(1);
  }

  // Construct the GitHub API URL
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });

    // Check if the response is OK (status code 200-299)
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();

    // Extract relevant information if needed
    const result = {
      stars: data.stargazers_count,
      forks: data.forks_count,
      issues: data.open_issues_count,
      license: data.license ? data.license.name : "No license",
      updated_at: data.updated_at,
      contributors_count: data.contributors_url,
    };

    return result;
  } catch (error) {
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Define function to get issues data from GitHub URL (last 3 months)
export async function fetchIssues(url: string) {
  const now = new Date();
  now.setMonth(now.getMonth() - 3); // Subtract three months
  const lastMonthDate = now.toISOString();

  // Build query URLs
  const repoPath = url.split("github.com/")[1];
  if (!repoPath) {
    throw new Error("Invalid GitHub URL");
  }

  // Ensure the repository path is in the format 'owner/repo'
  const [owner, repo] = repoPath.split("/").map((part) => part.trim());
  if (!owner || !repo) {
    throw new Error("Invalid GitHub repository path");
  }

  // Construct the GitHub API URLs for opened and close and still open issues
  const openIssuesURL = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&since=${lastMonthDate}`;
  const closedIssuesURL = `https://api.github.com/repos/${owner}/${repo}/issues?state=closed&since=${lastMonthDate}`;

  try {
    const openResponse = await fetch(openIssuesURL, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    const closedResponse = await fetch(closedIssuesURL, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    const openIssues = await openResponse.json();
    const closedIssues = await closedResponse.json();

    return [openIssues, closedIssues];
  } catch (error) {
    throw error; // Re-throw the error to be handled by the caller
  }
}

// function for getting the number of contributors from a GitHub repo
export async function fetchCollaboratorsCount(url: string): Promise<any[]> {
  if (!url || !url.startsWith("https://api.github.com/repos/")) {
    throw new Error("Invalid contributors count URL");
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    const contributors = await response.json();
    return contributors;
  } catch (error) {
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Fetch repo contents
export async function fetchRepoContents(url: string): Promise<File[]> {
  const repoPath = url.split("github.com/")[1];
  if (!repoPath) throw new Error("Invalid GitHub URL");

  const [owner, repo] = repoPath.split("/");
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    const files: File[] = await response.json();
    return files;
  } catch (error) {
    throw error;
  }
}
