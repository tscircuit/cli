import { expect, test } from "bun:test"
import { runBrowserTest } from "../fixtures/runBrowserTest"

test("step files not supported error", async () => {
  const result = await runBrowserTest({
    bugReportId: "1a0fdc2b-2e84-41b9-ac01-520fd1195fdb",
  })

  console.log("Errors:", result.errors)
  console.log("Has execution error:", result.hasExecutionError)

  // expect(result.hasExecutionError).toBe(false)
  // expect(result.errors.length).toBe(0)
}, 120_000)
