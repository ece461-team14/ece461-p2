# ECE 461 Project - npm and GitHub Package Registry and Metrics Analysis

**Authors:**
- Ata Ulas Guler
- Brendan McLaughlin
- James Murrer
- Jackson Fair

## Description

This project is a Node.js and TypeScript application designed to manage and analyze npm and GitHub packages in a package registry. The application supports uploading npm or GitHub packages via zip files and URLs, and performs various operations like retrieving package information, calculating metrics (e.g., rating, cost, etc.), and supporting package management tasks.

The backend includes endpoints for uploading packages, retrieving package details (e.g., rating, cost), and other administrative actions. The frontend provides a user interface for login, signup, and interaction with the registry, such as adding, updating, and querying packages.

## Purpose

The purpose of this project is to provide a package registry system that not only allows users to upload and manage npm and GitHub packages but also calculates and displays key metrics like rating and cost. It offers a comprehensive interface for interacting with the registry, managing users, and conducting administrative tasks (e.g., resetting the registry).

## Folder Structure

/backend: Contains the backend logic (Node.js server, API routes, and database interactions). /frontend: Contains the frontend React application for interacting with the registry and metrics. /src: /components: Contains React components (Login, Signup, AdminActions, etc.) App.tsx: Main application logic for handling routing and UI states. api.ts: API interaction utilities for frontend-backend communication. /assets: Stores images, styles, and other resources.

/package.json: Manages the project’s dependencies, scripts, and metadata. /tsconfig.json: TypeScript configuration for the project.

### Backend API Endpoints
- `POST /api/packages/upload`: Allows users to upload npm or GitHub packages via zip files or URLs.
- `GET /api/packages/{id}`: Fetches metadata for a specific package by ID (e.g., rating, cost, etc.).
- `GET /api/packages`: Retrieves a list of all available packages in the registry.
- `DELETE /api/packages/{id}`: Deletes a package by its ID.
- `POST /api/auth/login`: Authenticates a user based on username and password.
- `POST /api/auth/signup`: Registers a new user in the system.
- `DELETE /api/reset`: Resets the entire package registry (admin-only).

### Frontend Components
- **Login**: Allows users to log in by entering their username and password.
- **Signup**: Allows users to create a new account by providing a username and password.
- **AdminActions**: Provides administrative functionalities such as resetting the package registry.

## Prerequisites

Ensure the following are installed on your machine:

- **Node.js** (v14.x or later recommended)
- **npm** (v6.x or later)
- **GitHub API tokens** (for GitHub package analysis)
- **A MongoDB or SQL database** (for storing user data and package details)

### Configuration
1. **GitHub API Token**: Set the environment variable `$GITHUB_TOKEN` to provide your GitHub token for API access.
2. **Logging**: Use the `$LOG_FILE` environment variable to specify the log file location. The verbosity level is set via `$LOG_LEVEL` (0 for silent, 1 for informational, 2 for debug).

## Running the Application

To run the application, use the following commands:

1. Install dependencies:

npm install

2. Run the backend server:

npm start

### Uploading Packages

To upload an npm or GitHub package, use the **/api/packages/upload** endpoint. This can be done via the frontend UI or via a direct API request.

Supported upload formats:
- **npm packages**: Zip file containing the package.
- **GitHub repositories**: A direct URL to the repository.

### Interacting with Packages

Once the packages are uploaded, you can interact with them using the following API endpoints:
- **Get Package Information**: 

GET /api/packages/{id}{action} (for the purposes of this project it's rating or cost)
these are accessed via buttons currently

other used api endpoints include:

GET /api/packages

Retrieves a list of all available packages in the registry.

DELETE /api/packages/{id}

Removes a package from the registry.

### Admin-Only Actions

Admins can perform actions like resetting the entire registry by using the following endpoint:

DELETE /api/reset

This clears the user registry (aside from the one required admin user)

## Running Tests

To run the test suite:

npm run test

The test suite ensures the application is functioning correctly and covers a wide range of cases, especially related to package upload, retrieval, and analysis.

## Contribution Guidelines

To contribute to this project:

1. Clone the repository:
git clone https://github.com/jmurrer/ece461_project.git cd ece461_project


2. Create a new branch:
git checkout -b your-branch-name


3. Commit and push your changes:
git add . git commit -m "Description of changes" git push origin your-branch-name


4. Open a pull request and describe the changes made.

## Rebasing

To rebase your branch onto `main`:

git checkout <branch-name> git rebase main