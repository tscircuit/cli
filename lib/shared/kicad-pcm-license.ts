export const KICAD_PCM_SCHEMA_URLS = {
  1: "https://go.kicad.org/pcm/schemas/v1",
  2: "https://go.kicad.org/pcm/schemas/v2",
} as const

export type KicadPcmSchemaVersion = keyof typeof KICAD_PCM_SCHEMA_URLS
export type KicadPcmSchemaVersionPreference = "auto" | KicadPcmSchemaVersion

// Retain the v2 constants for callers that explicitly target the open schema.
export const KICAD_PCM_SCHEMA_VERSION = 2 as const
export const KICAD_PCM_SCHEMA_URL = KICAD_PCM_SCHEMA_URLS[2]

/**
 * License identifiers accepted by KiCad PCM schema v1 (KiCad 6+).
 * Source: https://go.kicad.org/pcm/schemas/v1#/definitions/License
 */
export const KICAD_PCM_V1_LICENSES = [
  "public-domain",
  "Apache",
  "Apache-1.0",
  "Apache-2.0",
  "Artistic",
  "Artistic-1.0",
  "Artistic-2.0",
  "BSD",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSD-4-Clause",
  "ISC",
  "CC-BY",
  "CC-BY-1.0",
  "CC-BY-2.0",
  "CC-BY-2.5",
  "CC-BY-3.0",
  "CC-BY-4.0",
  "CC-BY-SA",
  "CC-BY-SA-1.0",
  "CC-BY-SA-2.0",
  "CC-BY-SA-2.5",
  "CC-BY-SA-3.0",
  "CC-BY-SA-4.0",
  "CC-BY-ND",
  "CC-BY-ND-1.0",
  "CC-BY-ND-2.0",
  "CC-BY-ND-2.5",
  "CC-BY-ND-3.0",
  "CC-BY-ND-4.0",
  "CC-BY-NC",
  "CC-BY-NC-1.0",
  "CC-BY-NC-2.0",
  "CC-BY-NC-2.5",
  "CC-BY-NC-3.0",
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA",
  "CC-BY-NC-SA-1.0",
  "CC-BY-NC-SA-2.0",
  "CC-BY-NC-SA-2.5",
  "CC-BY-NC-SA-3.0",
  "CC-BY-NC-SA-4.0",
  "CC-BY-NC-ND",
  "CC-BY-NC-ND-1.0",
  "CC-BY-NC-ND-2.0",
  "CC-BY-NC-ND-2.5",
  "CC-BY-NC-ND-3.0",
  "CC-BY-NC-ND-4.0",
  "CC0-1.0",
  "CDDL-1.0",
  "CPL",
  "EFL",
  "EFL-1.0",
  "EFL-2.0",
  "MIT",
  "GPL",
  "GPL-1.0",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL",
  "LGPL-2.1",
  "LGPL-3.0",
  "GNU-LGPL-2.0",
  "GFDL",
  "GFDL-1.0",
  "GFDL-1.1",
  "GFDL-1.2",
  "GFDL-1.3",
  "GFDL-NIV",
  "LPPL",
  "LPPL-1.0",
  "LPPL-1.1",
  "LPPL-1.2",
  "LPPL-1.3",
  "MPL-1.1",
  "Perl",
  "Python-2.0",
  "QPL-1.0",
  "W3C",
  "Zlib",
  "Zope",
  "Zope-1.0",
  "Zope-1.1",
  "Zope-2.0",
  "Zope-2.1",
  "CERN-OHL",
  "WTFPL",
  "Unlicense",
  "open-source",
  "unrestricted",
] as const

const kicadPcmV1LicenseSet = new Set<string>(KICAD_PCM_V1_LICENSES)

export const isValidKicadPcmV1License = (license: unknown): license is string =>
  typeof license === "string" && kicadPcmV1LicenseSet.has(license.trim())

export function assertValidKicadPcmV1License(
  license: unknown,
): asserts license is string {
  if (!isValidKicadPcmV1License(license)) {
    const value = typeof license === "string" ? license.trim() : ""
    throw new Error(
      `Invalid KiCad PCM v1 license "${value || "(empty)"}". Choose a license allowed by ${KICAD_PCM_SCHEMA_URLS[1]} or use schema version 2 for KiCad 10+`,
    )
  }
}

/** KiCad PCM schema v2 accepts any non-empty license string. */
export const isValidKicadPcmV2License = (license: unknown): license is string =>
  typeof license === "string" && license.trim().length > 0

export function assertValidKicadPcmV2License(
  license: unknown,
): asserts license is string {
  if (!isValidKicadPcmV2License(license)) {
    throw new Error(
      `Invalid KiCad PCM v2 license "(empty)". License must be a non-empty string allowed by ${KICAD_PCM_SCHEMA_URLS[2]}`,
    )
  }
}

export function resolveKicadPcmSchemaVersion({
  license,
  preference = "auto",
}: {
  license: unknown
  preference?: KicadPcmSchemaVersionPreference
}): KicadPcmSchemaVersion {
  assertValidKicadPcmV2License(license)

  if (preference === 1) {
    assertValidKicadPcmV1License(license)
    return 1
  }

  if (preference === 2) return 2

  return isValidKicadPcmV1License(license) ? 1 : 2
}
