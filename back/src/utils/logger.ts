import * as fs from "fs/promises";

// Define log levels
enum LogLevel {
  SILENT = 0,
  INFO = 1,
  DEBUG = 2,
}

// Get log file path and log level from environment variables, with defaults
const logFile = process.env.LOG_FILE || process.exit(1);
const logLevel = parseInt(process.env.LOG_LEVEL || "0", 10);

// Ensure log file exists (optional, can remove if not necessary)
async function ensureLogFileExists() {
  try {
    await fs.access(logFile);
  } catch {
    await fs.writeFile(logFile, "", "utf8");
  }
}

// Utility function to log messages
async function log(message: string, level: LogLevel) {
  if (level <= logLevel) {
    const logMessage = `[${new Date().toISOString()}] ${
      LogLevel[level]
    }: ${message}\n`;
    await fs.appendFile(logFile, logMessage, "utf8");
  }
}

// Specific log level functions
export async function info(message: string) {
  await ensureLogFileExists();
  await log(message, LogLevel.INFO);
}

export async function debug(message: string) {
  await ensureLogFileExists();
  await log(message, LogLevel.DEBUG);
}

export async function silent(message: string) {
  await ensureLogFileExists();
  await log(message, LogLevel.SILENT);
}
