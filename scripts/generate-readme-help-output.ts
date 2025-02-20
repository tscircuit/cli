#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs"

const START_MARKER = "<!-- START_HELP_OUTPUT -->"
const END_MARKER = "<!-- END_HELP_OUTPUT -->"

const README_PATH = "./README.md"

const cliHelpOutput = Bun.spawnSync(["bun", "cli/main.ts", "--help"])
  .stdout.toString()
  .trim()

const lines = cliHelpOutput.split("\n")
let usageSection = ""
let description = ""
let optionsSection = "### ⚙️ Options\n\n"
let commandsSection =
  "### 🚀 Commands\n\n| Command | Description |\n|---------|------------|\n"

let inOptions = false
let inCommands = false
let currentCommand = ""
let currentDescription = ""

for (const line of lines) {
  if (line.startsWith("Usage:")) {
    usageSection = `### 📌 Usage\n\n\`\`\`\n${line.replace("Usage: ", "")}\n\`\`\`\n`
  } else if (line.startsWith("Options:")) {
    inOptions = true
    inCommands = false
  } else if (line.startsWith("Commands:")) {
    inCommands = true
    inOptions = false
  } else if (inOptions && line.trim().startsWith("-")) {
    const parts = line.trim().split(/\s{2,}/) // Split by multiple spaces
    const flag = `- \`${parts[0].trim()}\``
    const desc = parts.length > 1 ? ` *${parts.slice(1).join(" ")}*` : ""
    optionsSection += `${flag}${desc}\n`
  } else if (inCommands) {
    const parts = line.trim().split(/\s{2,}/)

    if (parts.length > 1) {
      // Save previous command before processing a new one
      if (currentCommand) {
        commandsSection += `| ${currentCommand} | ${currentDescription.trim()} |\n`
      }

      // Start a new command
      currentCommand = `\`${parts[0].trim()}\``
      currentDescription = parts.slice(1).join(" ")
    } else if (currentCommand) {
      // Append to the previous command's description if it's indented
      // biome-ignore lint/style/useTemplate: <explanation>
      currentDescription += " " + line.trim()
    }
  } else if (!usageSection && line.trim()) {
    description += `${line}\n\n`
  }
}

// Add the last command that was being processed
if (currentCommand) {
  commandsSection += `| ${currentCommand} | ${currentDescription.trim()} |\n`
}

const formattedHelp = `${START_MARKER}

${usageSection}
${description}
${optionsSection}
${commandsSection}

${END_MARKER}`

const readmeContent = readFileSync(README_PATH, "utf8")

const updatedReadme = readmeContent.replace(
  new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`),
  formattedHelp,
)

writeFileSync(README_PATH, updatedReadme)

console.log("README.md updated successfully!")
