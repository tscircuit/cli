import { test, expect } from "bun:test"
import { createLocalCacheEngine } from "lib/shared/get-complete-platform-config"
import { createHash } from "node:crypto"
import { temporaryDirectory } from "tempy"
import fs from "node:fs"
import path from "node:path"

test("filesystem cache get returns null for missing key", () => {
  const cacheDir = temporaryDirectory()
  const cache = createLocalCacheEngine(cacheDir)

  expect(cache.getItem("nonexistent-key")).toBeNull()
})

test("filesystem cache set then get returns cached value", () => {
  const cacheDir = temporaryDirectory()
  const cache = createLocalCacheEngine(cacheDir)

  const key = JSON.stringify({ type: "resistor", resistance: "10k" })
  const value = JSON.stringify({ jlcpcb: ["C12345"] })

  cache.setItem(key, value)
  const result = cache.getItem(key)

  expect(result).toBe(value)
})

test("filesystem cache creates directory and writes hashed file", () => {
  const cacheDir = path.join(temporaryDirectory(), "nested", "cache")
  const cache = createLocalCacheEngine(cacheDir)

  const key = "test-key"
  const value = '{"data":"hello"}'
  const expectedHash = createHash("md5").update(key).digest("hex")
  const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_")
  const keySuffix = keyWithSafeCharacters.slice(
    keyWithSafeCharacters.length - 10,
  )

  cache.setItem(key, value)

  const filePath = path.join(cacheDir, `${keySuffix}-${expectedHash}.json`)
  expect(fs.existsSync(filePath)).toBe(true)
  expect(fs.readFileSync(filePath, "utf-8")).toBe(value)
})

test("filesystem cache uses deterministic hashing", () => {
  const cacheDir = temporaryDirectory()
  const cache = createLocalCacheEngine(cacheDir)

  const key = JSON.stringify({ type: "capacitor", capacitance: "100nF" })
  const value = JSON.stringify({ jlcpcb: ["C99999"] })

  cache.setItem(key, value)

  // A second cache instance with the same dir should read the same data
  const cache2 = createLocalCacheEngine(cacheDir)
  expect(cache2.getItem(key)).toBe(value)
})

test("filesystem cache returns null after reading nonexistent dir", () => {
  const cache = createLocalCacheEngine("/tmp/nonexistent-dir-abc123xyz")
  expect(cache.getItem("any-key")).toBeNull()
})

test("filesystem cache different keys produce different files", () => {
  const cacheDir = temporaryDirectory()
  const cache = createLocalCacheEngine(cacheDir)

  cache.setItem("key-a", '{"a":1}')
  cache.setItem("key-b", '{"b":2}')

  expect(cache.getItem("key-a")).toBe('{"a":1}')
  expect(cache.getItem("key-b")).toBe('{"b":2}')

  const files = fs.readdirSync(cacheDir)
  expect(files.length).toBe(2)
})
