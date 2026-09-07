import { expect, test } from "bun:test"
import { getThreadWorkerPoolTestFixture } from "tests/fixtures/get-thread-worker-pool-test-fixture"

test("a clean worker exit without a result rejects the job and recovers the queue", async () => {
  const { pool, cleanup } = getThreadWorkerPoolTestFixture()
  const failed = pool.queueJob({ id: "failed", outcome: "clean_exit" })
  const next = pool.queueJob({ id: "after-exit", outcome: "success" })

  const settled = Promise.allSettled([failed, next])

  try {
    const [failedResult, nextResult] = await settled
    expect(failedResult.status).toBe("rejected")
    expect(failedResult).toMatchObject({
      reason: { message: "Worker exited with code 0" },
    })
    expect(nextResult).toEqual({ status: "fulfilled", value: "after-exit" })
  } finally {
    await cleanup()
  }
})
