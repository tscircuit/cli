/**
 * License identifiers accepted by the KiCad PCM v1 schema.
 *
 * Source: https://go.kicad.org/pcm/schemas/v1
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

export type KicadPcmV1License = (typeof KICAD_PCM_V1_LICENSES)[number]

const kicadPcmV1LicenseSet = new Set<string>(KICAD_PCM_V1_LICENSES)

export const isValidKicadPcmV1License = (
  license: string,
): license is KicadPcmV1License => kicadPcmV1LicenseSet.has(license)

export function assertValidKicadPcmV1License(
  license: string,
): asserts license is KicadPcmV1License {
  if (!isValidKicadPcmV1License(license)) {
    const displayLicense = license || "(empty)"
    throw new Error(
      `Invalid KiCad PCM v1 license "${displayLicense}". Use a license allowed by https://go.kicad.org/pcm/schemas/v1`,
    )
  }
}
