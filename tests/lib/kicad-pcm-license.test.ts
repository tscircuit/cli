import { expect, test } from "bun:test"
import {
  assertValidKicadPcmV1License,
  assertValidKicadPcmV2License,
  isValidKicadPcmV1License,
  isValidKicadPcmV2License,
  resolveKicadPcmSchemaVersion,
} from "lib/shared/kicad-pcm-license"

test("accepts licenses from the KiCad PCM v1 schema", () => {
  expect(isValidKicadPcmV1License("CC-BY-ND-4.0")).toBe(true)
  expect(isValidKicadPcmV1License("MIT")).toBe(true)
  expect(isValidKicadPcmV1License("LicenseRef-Custom")).toBe(false)
  expect(() => assertValidKicadPcmV1License("CC-BY-ND-4.0")).not.toThrow()
})

test("accepts open license strings from the KiCad PCM v2 schema", () => {
  expect(isValidKicadPcmV2License("CC-BY-ND-4.0")).toBe(true)
  expect(isValidKicadPcmV2License("Unknown")).toBe(true)
  expect(() => assertValidKicadPcmV2License("LicenseRef-Custom")).not.toThrow()
})

test("auto selects the oldest compatible PCM schema", () => {
  expect(resolveKicadPcmSchemaVersion({ license: "CC-BY-ND-4.0" })).toBe(1)
  expect(resolveKicadPcmSchemaVersion({ license: "LicenseRef-Custom" })).toBe(2)
})

test("forced v1 rejects licenses that only schema v2 supports", () => {
  expect(() =>
    resolveKicadPcmSchemaVersion({
      license: "LicenseRef-Custom",
      preference: 1,
    }),
  ).toThrow('Invalid KiCad PCM v1 license "LicenseRef-Custom"')
})

test("rejects missing and blank KiCad PCM licenses", () => {
  expect(isValidKicadPcmV1License(undefined)).toBe(false)
  expect(isValidKicadPcmV2License(undefined)).toBe(false)
  expect(isValidKicadPcmV2License("")).toBe(false)
  expect(isValidKicadPcmV2License("   ")).toBe(false)
  expect(() => assertValidKicadPcmV2License("")).toThrow(
    'Invalid KiCad PCM v2 license "(empty)"',
  )
})
