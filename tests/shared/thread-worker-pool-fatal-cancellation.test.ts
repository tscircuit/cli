import { expect, test } from "bun:test"
import { getThreadWorkerPoolTestFixture } from "tests/fixtures/get-thread-worker-pool-test-fixture"

test("fatal results cancel other running jobs without waiting for their timeout", async () => {
  const { pool, started, cancellationError, cleanup } =
    getThreadWorkerPoolTestFixture(2)
  const active = pool.queueJob({ id: "active", outcome: "hang" })
  const activeSettled = Promise.allSettled([active])

  try {
    await started
    const fatal = pool.queueJob({ id: "fatal", outcome: "fatal" })
    const queued = pool.queueJob({ id: "queued", outcome: "success" })
    const queuedSettled = Promise.allSettled([queued])

    expect(await fatal).toBe("fatal")
    expect(await activeSettled).toEqual([
      { status: "rejected", reason: cancellationError },
    ])
    expect(await queuedSettled).toEqual([
      { status: "rejected", reason: cancellationError },
    ])
  } finally {
    await cleanup()
  }
})
