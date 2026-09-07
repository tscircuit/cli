import { expect, test } from "bun:test"
import { getThreadWorkerPoolTestFixture } from "tests/fixtures/get-thread-worker-pool-test-fixture"

test("worker errors replace the worker before dispatching the next queued job", async () => {
  const { pool, cleanup } = getThreadWorkerPoolTestFixture()
  const failed = pool.queueJob({ id: "failed", outcome: "error" })
  const next = pool.queueJob({ id: "after-error", outcome: "success" })
  const last = pool.queueJob({ id: "after-success", outcome: "success" })

  const settled = Promise.allSettled([failed, next, last])

  try {
    const [failedResult, nextResult, lastResult] = await settled
    expect(failedResult.status).toBe("rejected")
    expect(failedResult).toMatchObject({
      reason: { message: "Worker routing failed" },
    })
    expect(nextResult).toEqual({ status: "fulfilled", value: "after-error" })
    expect(lastResult).toEqual({ status: "fulfilled", value: "after-success" })
  } finally {
    await cleanup()
  }
})
