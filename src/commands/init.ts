// This is init.ts
import { execSync } from "child_process";
import chalk from "chalk";
import readline from "readline";

// Function to get the latest available version of tsci
function getLatestVersion(): string | null {
  try {
    return execSync("npm show tsci version").toString().trim();
  } catch (error) {
    console.error(chalk.red("Error fetching latest tsci version."));
    return null;
  }
}

// Function to get the installed version
function getInstalledVersion(): string | null {
  try {
    return execSync("tsci --version").toString().trim();
  } catch (error) {
    console.error(chalk.red("Error fetching installed tsci version."));
    return null;
  }
}

// Function to prompt user for update
function promptUpdate(latestVersion: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    chalk.yellow(
      `A new version of tsci (v${latestVersion}) is available. Do you want to update? (yes/no): `
    ),
    (answer) => {
      if (answer.toLowerCase() === "yes") {
        console.log(chalk.green("Updating tsci..."));
        try {
          execSync("npm install -g tsci", { stdio: "inherit" });
          console.log(chalk.green("tsci updated successfully!"));
        } catch (error) {
          console.error(chalk.red("Failed to update tsci."));
        }
      } else {
        console.log(chalk.blue("Skipping update."));
      }
      rl.close();
    }
  );
}

// Main function to check versions
function checkTsciVersion() {
  const latestVersion = getLatestVersion();
  const installedVersion = getInstalledVersion();

  if (latestVersion && installedVersion && latestVersion !== installedVersion) {
    promptUpdate(latestVersion);
  } else {
    console.log(chalk.green("tsci is up to date!"));
  }
}

// Call function when `tsci init` runs
checkTsciVersion();

