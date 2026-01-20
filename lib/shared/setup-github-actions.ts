import fs from "node:fs"
import path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

export const setupGithubActions = (projectDir: string = process.cwd()) => {
  const findGitRoot = (startDir: string): string | null => {
    let dir = path.resolve(startDir)
    while (dir !== path.parse(dir).root) {
      if (fs.existsSync(path.join(dir, ".git"))) {
        return dir
      }
      dir = path.dirname(dir)
    }
    return null
  }

  const gitRoot = findGitRoot(projectDir) ?? projectDir
  const workflowsDir = path.join(gitRoot, ".github", "workflows")
  fs.mkdirSync(workflowsDir, { recursive: true })

  const buildWorkflow = `name: tscircuit Build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx tsci build
`

  const snapshotWorkflow = `name: tscircuit Snapshot

on:
  push:
    branches: [main]
  pull_request:

jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx tsci snapshot
`

  writeFileIfNotExists(
    path.join(workflowsDir, "tscircuit-build.yml"),
    buildWorkflow,
  )
  writeFileIfNotExists(
    path.join(workflowsDir, "tscircuit-snapshot.yml"),
    snapshotWorkflow,
  )
}
