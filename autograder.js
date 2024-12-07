import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const group = 14;
const ghToken = process.env.GITHUB_TOKEN;
const baseUrl = "http://dl-berlin.ecn.purdue.edu:8000";

function printReadableScore(data) {
  console.log("Scores:");
  for (const [group, tests] of Object.entries(data)) {
    if (typeof tests === "object") {
      console.log(`\n${group}:`);
      for (const [test, score] of Object.entries(tests)) {
        if (test === "Total") {
          console.log(`  ${test}: ${score}`);
        } else {
          const status = score === 0 ? "FAIL" : "PASS";
          const color = score === 0 ? "\x1b[31m" : "\x1b[32m";
          console.log(`  ${test}: ${color}${status}\x1b[0m`);
        }
      }
    } else {
      console.log(`\n${group}: ${tests}`);
    }
  }
}

async function scheduleRun() {
  try {
    const response = await axios.post(
      `${baseUrl}/schedule`,
      {
        group,
        gh_token: ghToken,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log("Run scheduled successfully:", response.data);
  } catch (error) {
    console.error(
      "Error scheduling run:",
      error.response ? error.response.data : error.message
    );
  }
}

async function checkProgress() {
  try {
    const response = await axios.get(`${baseUrl}/run/all`, {
      data: {
        group,
        gh_token: ghToken,
      },
      headers: { "Content-Type": "application/json" },
    });
    console.log("Progress:", response.data);
  } catch (error) {
    console.error(
      "Error checking progress:",
      error.response ? error.response.data : error.message
    );
  }
}

async function getBestScore() {
  try {
    const response = await axios.get(`${baseUrl}/best_run`, {
      data: {
        group,
        gh_token: ghToken,
      },
      headers: { "Content-Type": "application/json" },
    });
    printReadableScore(response.data);
  } catch (error) {
    console.error(
      "Error getting best score:",
      error.response ? error.response.data : error.message
    );
  }
}

async function getLastScore() {
  try {
    const response = await axios.get(`${baseUrl}/last_run`, {
      data: {
        group,
        gh_token: ghToken,
      },
      headers: { "Content-Type": "application/json" },
    });
    printReadableScore(response.data);
  } catch (error) {
    console.error(
      "Error getting last score:",
      error.response ? error.response.data : error.message
    );
  }
}

async function abortRun() {
  try {
    const data = {
      group,
      gh_token: ghToken,
    };
    const response = await fetch(baseUrl + "/run", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Run aborted successfully:", result);
    return result;
  } catch (error) {
    console.error("Error aborting the run:", error);
    throw error;
  }
}

async function getStats() {
  const data = {
    group,
    gh_token: ghToken,
  };

  try {
    const response = await fetch(baseUrl + "/stats", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Stats fetched successfully:", result);
    return result;
  } catch (error) {
    console.error("Error fetching stats:", error);
    throw error;
  }
}

async function downloadLog(logPath) {
  try {
    const response = await axios.get(`${baseUrl}/log/download`, {
      data: {
        group,
        gh_token: ghToken,
        log: logPath,
      },
      headers: { "Content-Type": "application/json" },
    });
    console.log("Log downloaded:", response.data);
  } catch (error) {
    console.error(
      "Error downloading log:",
      error.response ? error.response.data : error.message
    );
  }
}

const command = process.argv[2];
const logPath = process.argv[3];

switch (command) {
  case "schedule":
    scheduleRun();
    break;
  case "progress":
    checkProgress();
    break;
  case "best":
    getBestScore();
    break;
  case "last":
    getLastScore();
    break;
  case "abort":
    abortRun();
    break;
  case "stat":
    getStats();
    break;
  case "log":
    if (!logPath) {
      console.error("Please provide the log path.");
    } else {
      downloadLog(logPath);
    }
    break;
  default:
    console.log("Usage: node autograder.js <command> [logPath]");
    console.log("Commands:");
    console.log("  schedule  - Schedule a new run");
    console.log("  progress  - Check progress of all runs");
    console.log("  best      - Get the best score");
    console.log("  last      - Get the last score");
    console.log("  log       - Download log file (requires logPath)");
    break;
}
