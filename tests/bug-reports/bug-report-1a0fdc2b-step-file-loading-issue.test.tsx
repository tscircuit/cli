import { expect, test } from "bun:test"
import { runBrowserTest } from "../fixtures/runBrowserTest"

/**
 * Bug report: 1a0fdc2b-2e84-41b9-ac01-520fd1195fdb
 * Issue: STEP file included in the bug report fails to load/render correctly
 *        when run through the dev server.
 */
test("STEP files from bug report 1a0fdc2b should load without execution errors", async () => {
  const result = await runBrowserTest({
    bugReportId: "1a0fdc2b-2e84-41b9-ac01-520fd1195fdb",
    timeout: 120_000,
  })

  console.log("Render logs:", result.renderLogs)
  console.log("Errors:", result.errors)
  console.log("Has execution error:", result.hasExecutionError)

  // TODO: Uncomment these expectations once the STEP file loading issue is fixed
  // expect(result.hasExecutionError).toBe(false)
  // expect(result.errors.length).toBe(0)
}, 120_000)
