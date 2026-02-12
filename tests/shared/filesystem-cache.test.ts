import { test, expect } from "bun:test"
import { createFilesystemCache } from "lib/shared/get-complete-platform-config"
import { createHash } from "node:crypto"
import { temporaryDirectory } from "tempy"
import fs from "node:fs"
import path from "node:path"

test("filesystem cache get returns null for missing key", () => {
  const cacheDir = temporaryDirectory()
  const cache = createFilesystemCache(cacheDir)

  expect(cache.get("nonexistent-key")).toBeNull()
})

test("filesystem cache set then get returns cached value", () => {
  const cacheDir = temporaryDirectory()
  const cache = createFilesystemCache(cacheDir)

  const key = JSON.stringify({ type: "resistor", resistance: "10k" })
  const value = JSON.stringify({ jlcpcb: ["C12345"] })

  cache.set(key, value)
  const result = cache.get(key)

  expect(result).toBe(value)
})

test("filesystem cache creates directory and writes hashed file", () => {
  const cacheDir = path.join(temporaryDirectory(), "nested", "cache")
  const cache = createFilesystemCache(cacheDir)

  const key = "test-key"
  const value = '{"data":"hello"}'
  const expectedHash = createHash("md5").update(key).digest("hex")
  const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_")
  const keySuffix = keyWithSafeCharacters.slice(
    keyWithSafeCharacters.length - 10,
  )

  cache.set(key, value)

  const filePath = path.join(cacheDir, `${keySuffix}-${expectedHash}.json`)
  expect(fs.existsSync(filePath)).toBe(true)
  expect(fs.readFileSync(filePath, "utf-8")).toBe(value)
})

test("filesystem cache uses deterministic hashing", () => {
  const cacheDir = temporaryDirectory()
  const cache = createFilesystemCache(cacheDir)

  const key = JSON.stringify({ type: "capacitor", capacitance: "100nF" })
  const value = JSON.stringify({ jlcpcb: ["C99999"] })

  cache.set(key, value)

  // A second cache instance with the same dir should read the same data
  const cache2 = createFilesystemCache(cacheDir)
  expect(cache2.get(key)).toBe(value)
})

test("filesystem cache returns null after reading nonexistent dir", () => {
  const cache = createFilesystemCache("/tmp/nonexistent-dir-abc123xyz")
  expect(cache.get("any-key")).toBeNull()
})

test("filesystem cache different keys produce different files", () => {
  const cacheDir = temporaryDirectory()
  const cache = createFilesystemCache(cacheDir)

  cache.set("key-a", '{"a":1}')
  cache.set("key-b", '{"b":2}')

  expect(cache.get("key-a")).toBe('{"a":1}')
  expect(cache.get("key-b")).toBe('{"b":2}')

  const files = fs.readdirSync(cacheDir)
  expect(files.length).toBe(2)
})
