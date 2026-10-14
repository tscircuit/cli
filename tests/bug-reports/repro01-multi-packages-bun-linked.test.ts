import { expect, test } from "bun:test"
import { runBrowserTestWithSteps } from "../fixtures/runBrowserTestWithSteps"
import * as fs from "node:fs"
import path from "node:path"

test("repro01-multi-packages-bun-linked", async () => {
  const result = await runBrowserTestWithSteps([
    {
      stepType: "clone_bug_report",
      bugReportId: "3eb6949f-1ed5-4d56-a930-27350dcc5c12",
      modifyFs(tmpDir) {
        const packageJsonPath = path.join(tmpDir, "package.json")
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        )
        packageJson.main = "dist/index.js"
        packageJson.devDependencies.tscircuit = "0.0.1007"
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log(fs.readFileSync(packageJsonPath, "utf-8"))
      },
      postInstallScript: "bunx tsci transpile && bun link",
    },
    {
      stepType: "clone_bug_report",
      bugReportId: "a6b9899c-ea2c-4c04-9f26-e1847a782c8c",
      modifyFs(tmpDir) {
        const packageJsonPath = path.join(tmpDir, "package.json")
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        )
        packageJson.devDependencies.tscircuit = "0.0.1007"
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log(fs.readFileSync(packageJsonPath, "utf-8"))
      },
      postInstallScript: "bunx tsci transpile && bun link",
    },
    {
      stepType: "clone_bug_report",
      bugReportId: "ef59c356-99e2-4e6a-bf98-2e9faa0dd60f",
      modifyFs(tmpDir) {
        const packageJsonPath = path.join(tmpDir, "package.json")
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        )
        packageJson.devDependencies.tscircuit = "0.0.1007"
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
        console.log(fs.readFileSync(packageJsonPath, "utf-8"))
      },
    },
    {
      stepType: "run_browser_test",
      clonedBugReportId: "ef59c356-99e2-4e6a-bf98-2e9faa0dd60f",
    },
  ])

  console.log("Browser test result:", result.browserTestResult)
}, 120_000)
