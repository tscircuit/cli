import { expect, test } from "bun:test"
import { CoalescedFileSync } from "lib/dev/coalesced-file-sync"
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test("edits during an upload are serialized and use the latest pending content", async () => {
  let contents = "first"
  const uploaded: string[] = []
  let release!: () => void
  const sync = new CoalescedFileSync(
    async () => {
      const snapshot = contents
      if (snapshot === "first")
        await new Promise<void>((resolve) => {
          release = resolve
        })
      uploaded.push(snapshot)
    },
    () => {},
    20,
    80,
  )
  sync.enqueue("index.tsx")
  await pause(40)
  contents = "intermediate"
  sync.enqueue("index.tsx")
  contents = "latest"
  sync.enqueue("index.tsx")
  await pause(100)
  expect(uploaded).toEqual([])
  release()
  await pause(40)
  expect(uploaded).toEqual(["first", "latest"])
  await sync.stop()
})

test("sync errors remain visible and subsequent saves recover; stop cancels timers", async () => {
  let attempts = 0
  const errors: unknown[] = []
  const sync = new CoalescedFileSync(
    async () => {
      if (++attempts === 1) throw new Error("upload failed")
    },
    (_path, error) => errors.push(error),
    20,
    80,
  )
  sync.enqueue("index.tsx")
  await pause(40)
  sync.enqueue("index.tsx")
  await pause(40)
  expect(attempts).toBe(2)
  expect(errors).toHaveLength(1)
  sync.enqueue("index.tsx")
  await sync.stop()
  sync.enqueue("index.tsx")
  await pause(100)
  expect(attempts).toBe(2)
})
