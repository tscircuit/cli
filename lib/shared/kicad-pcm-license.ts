export const KICAD_PCM_SCHEMA_VERSION = 2 as const
export const KICAD_PCM_SCHEMA_URL =
  "https://go.kicad.org/pcm/schemas/v2" as const

/**
 * KiCad PCM schema v2 accepts an open license string instead of the fixed v1
 * license enum. We additionally require useful content rather than emitting a
 * missing or whitespace-only declaration.
 */
export const isValidKicadPcmV2License = (license: unknown): license is string =>
  typeof license === "string" && license.trim().length > 0

export function assertValidKicadPcmV2License(
  license: unknown,
): asserts license is string {
  if (!isValidKicadPcmV2License(license)) {
    throw new Error(
      `Invalid KiCad PCM v2 license "(empty)". License must be a non-empty string allowed by ${KICAD_PCM_SCHEMA_URL}`,
    )
  }
}
