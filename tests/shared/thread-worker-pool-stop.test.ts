import { expect, test } from "bun:test"
import { getThreadWorkerPoolTestFixture } from "tests/fixtures/get-thread-worker-pool-test-fixture"

test("stop cancels active and queued jobs and terminates a busy worker", async () => {
  const { pool, started, logs, cleanup } = getThreadWorkerPoolTestFixture()
  const reason = new Error("Routing cancelled")
  const active = pool.queueJob({ id: "active", outcome: "hang" })
  const queued = pool.queueJob({ id: "queued", outcome: "success" })
  const settled = Promise.allSettled([active, queued])

  try {
    await started
    await Promise.all([pool.stop(reason), pool.stop(reason)])

    expect(await settled).toEqual([
      { status: "rejected", reason },
      { status: "rejected", reason },
    ])
    expect(logs).toEqual(["active"])
    await expect(
      pool.queueJob({ id: "after-stop", outcome: "success" }),
    ).rejects.toBe(reason)
  } finally {
    await cleanup()
  }
})
