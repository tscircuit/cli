#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs"

const START_MARKER = "<!-- START_HELP_OUTPUT -->"
const END_MARKER = "<!-- END_HELP_OUTPUT -->"

const README_PATH = "./README.md"

const cliHelpOutput = Bun.spawnSync(["bun", "cli/main.ts", "--help"])
  .stdout.toString()
  .trim()

const readmeContent = readFileSync(README_PATH, "utf8")

const updatedReadme = readmeContent.replace(
  new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`),
  `${START_MARKER}\n${cliHelpOutput}\n${END_MARKER}`,
)

writeFileSync(README_PATH, updatedReadme)

console.log("README.md updated successfully!")
