# ECE 461 Project - npm and GitHub Package Metric Analysis

Authors:

Ata Ulas Guler
Brendan McLaughlin
James Murrer
Jackson Fair

# Description

This project is a Node.js and TypeScript application designed to evaluate npm and GitHub repositories using several key metrics: bus factor, correctness, ramp-up time, responsiveness, and license status. It supports GitHub API interactions, calculates the NetScore based on custom weights, and outputs the results in NDJSON format. The application is built with modern JavaScript and TypeScript practices and includes features such as logging, testing, and code coverage.

# Purpose

The purpose of this project is to assess the quality and maintainability of npm packages and repositories by calculating several software metrics. The application is configured to run on a Linux machine with an executable script (run) and produce NDJSON output.

# Folder Structure

dist/: Contains the compiled JavaScript files.
app.js: Main compiled JavaScript file generated from TypeScript.
app.js.map: Source map for debugging.
node_modules/: Contains all dependencies installed through npm.

src/: Contains the TypeScript source files:
app.ts: Runs the main logic of the application.
metric_score.ts: Generates scores based on metrics.
scripts/install.sh: Script for installing RPM and Node.js.

test.txt: Contains test repositories for evaluation.
.gitignore: Specifies files and directories to ignore in version control.
eslint.config.mjs: ESLint configuration for code linting.
package.json: Manages the project's dependencies, scripts, and metadata.
package-lock.json: Auto-generated file that locks the versions of installed npm packages.
tsconfig.json: TypeScript configuration file that defines how TypeScript files are compiled.
run: Executable script to install, test, or run the application.

# Prerequisites

Ensure the following are installed on your machine:

Node.js (v14.x or later recommended)
npm (v6.x or later)
GitHub API tokens (configured using the $GITHUB_TOKEN environment variable)
Log file configuration using $LOG_FILE and log level configuration using $LOG_LEVEL
Configuration

GitHub API Token: Set the environment variable $GITHUB_TOKEN to provide your GitHub token for API access.
Logging: Use the $LOG_FILE environment variable to specify the log file location. The verbosity level is set via $LOG_LEVEL (0 for silent, 1 for informational, 2 for debug).

# Running the Application

The application is designed to be invoked with an executable file named run. Ensure the permissions are set to executable by running:

chmod +x run

# Commands:
Install Dependencies:

./run install
This command installs all necessary dependencies for the project. The program will exit with code 0 on success and a non-zero value on failure.

Run the Application with URL List:

./run <URL_FILE>
BE SURE TO SET YOUR GITHUB TOKEN (export GUTHUB_TOKEN=<your token>) BEFORE RUNNING THE APPLICATION OR IT WILL NOT FUNCTION PROPERLY
The URL_FILE must contain a list of newline-delimited URLs from npm or GitHub. The application will analyze each repository and output NDJSON with fields:

URL
NetScore
NetScore_Latency
RampUp
RampUp_Latency
Correctness
Correctness_Latency
BusFactor
BusFactor_Latency
ResponsiveMaintainer
ResponsiveMaintainer_Latency
License
License_Latency

Each score is normalized between 0 and 1. Latency values are in seconds, rounded to three decimal places.

Run Tests:

./run test
This command runs the test suite, which contains at least 20 distinct test cases and aims for 80% line coverage. Output example:

X/Y test cases passed. Z% line coverage achieved.
The program exits with code 0 on success and a non-zero value on failure.

# Metrics

NetScore: Weighted sum of the metrics, based on Sarah’s priorities. Weights and justifications are included in the project report.
Bus Factor: Evaluates the risk of key contributors leaving the project.
Correctness: Measures the overall health and functionality of the repository.
Ramp-Up Time: Estimates how long it takes for a developer to become productive with the repository.
Responsiveness: Assesses the maintainers’ responsiveness to issues and pull requests.
License: Determines whether the repository has an appropriate license.
Each metric reports latency values for calculating the metric.

# Logging

Logging behavior is controlled by two environment variables:

$LOG_FILE: Path to the log file.
$LOG_LEVEL: Verbosity level (0 for silent, 1 for informational, 2 for debug).
If $LOG_LEVEL is not specified, it defaults to 0.

# Error Handling

In the event of an error, the program will print a useful error message to the console and exit with return code 1.

# Contribution Guidelines

Clone the repository:

git clone https://github.com/jmurrer/ece461_project.git
cd ece461_project

Create a new branch:

git checkout -b your-branch-name

Commit and push your changes:

git add . (or specify the files if you don't want to commit all of them)
git commit -m "Description of changes"
git push origin your-branch-name
Open a pull request and describe the changes made.

# Rebasing

To rebase your branch onto main:


git checkout <branch-name>
git rebase main
Resolve conflicts as needed. Use git rebase --continue to proceed, or git rebase --abort to stop.

Code Review Process

Before merging, all team members must review the changes. Pull requests are only merged into main after approval from all contributors.
