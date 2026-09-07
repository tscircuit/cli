import { expect, test } from "bun:test"
import { getThreadWorkerPoolTestFixture } from "tests/fixtures/get-thread-worker-pool-test-fixture"

test("stop rejects jobs that are waiting for worker initialization", async () => {
  const { pool, logs, cleanup } = getThreadWorkerPoolTestFixture()
  const reason = new Error("Stopped before dispatch")
  const queued = pool.queueJob({ id: "pending", outcome: "success" })
  const settled = Promise.allSettled([queued])

  try {
    await pool.stop(reason)
    expect(await settled).toEqual([{ status: "rejected", reason }])
    expect(logs).toEqual([])
  } finally {
    await cleanup()
  }
})
