import { expect, test } from "bun:test"
import { getThreadWorkerPoolTestFixture } from "tests/fixtures/get-thread-worker-pool-test-fixture"

test("worker exits replace the worker before dispatching the next queued job", async () => {
  const { pool, cleanup } = getThreadWorkerPoolTestFixture()
  const failed = pool.queueJob({ id: "failed", outcome: "exit" })
  const next = pool.queueJob({ id: "after-exit", outcome: "success" })

  const settled = Promise.allSettled([failed, next])

  try {
    const [failedResult, nextResult] = await settled
    expect(failedResult.status).toBe("rejected")
    expect(failedResult).toMatchObject({
      reason: { message: "Worker exited with code 1" },
    })
    expect(nextResult).toEqual({ status: "fulfilled", value: "after-exit" })
  } finally {
    await cleanup()
  }
})
