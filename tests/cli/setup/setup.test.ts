import { test, expect } from "bun:test"
import { temporaryDirectory } from "tempy"
import fs from "node:fs"
import path from "node:path"
import { setupGithubActions } from "lib/shared/setup-github-actions"

// Ensure actions are created relative to the git root

test("setupGithubActions places workflows in git root", () => {
  const gitRoot = temporaryDirectory()
  const projectDir = path.join(gitRoot, "sub", "project")
  fs.mkdirSync(projectDir, { recursive: true })
  fs.mkdirSync(path.join(gitRoot, ".git"))

  setupGithubActions(projectDir)

  const workflowsDir = path.join(gitRoot, ".github", "workflows")
  const buildExists = fs.existsSync(
    path.join(workflowsDir, "tscircuit-build.yml"),
  )
  const snapshotExists = fs.existsSync(
    path.join(workflowsDir, "tscircuit-snapshot.yml"),
  )
  expect(buildExists && snapshotExists).toBe(true)
})
