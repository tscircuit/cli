import { expect, test } from "bun:test"
import {
  assertValidKicadPcmV2License,
  isValidKicadPcmV2License,
} from "lib/shared/kicad-pcm-license"

test("accepts open license strings from the KiCad PCM v2 schema", () => {
  expect(isValidKicadPcmV2License("CC-BY-ND-4.0")).toBe(true)
  expect(isValidKicadPcmV2License("Unknown")).toBe(true)
  expect(() => assertValidKicadPcmV2License("LicenseRef-Custom")).not.toThrow()
})

test("rejects missing and blank KiCad PCM v2 licenses", () => {
  expect(isValidKicadPcmV2License(undefined)).toBe(false)
  expect(isValidKicadPcmV2License("")).toBe(false)
  expect(isValidKicadPcmV2License("   ")).toBe(false)
  expect(() => assertValidKicadPcmV2License("")).toThrow(
    'Invalid KiCad PCM v2 license "(empty)"',
  )
})
