import { expect, test } from "bun:test"
import { runBrowserTest } from "../fixtures/runBrowserTest"
import * as fs from "node:fs"
import path from "node:path"

test("bug report 35b2ec78-e859-48e3-860c-3e420c7533f0", async () => {
  const result = await runBrowserTest({
    bugReportId: "35b2ec78-e859-48e3-860c-3e420c7533f0",
    modifyFs(tmpDir) {
      console.log(fs.readFileSync(path.join(tmpDir, "package.json"), "utf-8"))
    },
  })

  // This bug report has an execution error
  expect(result.hasExecutionError).toBe(true)
  console.log(result.errors)
  expect(result.errors.length).toBeGreaterThan(0)
}, 120_000)
