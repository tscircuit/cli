import kleur from "kleur"
import type { FootprinterDiscoveryCandidate } from "lib/shared/circuit-json-to-footprinter"

export const logMissing3dModelWarning = ({
  filePath,
  closestFootprinter,
}: {
  filePath: string
  closestFootprinter?: FootprinterDiscoveryCandidate
}) => {
  const footprinterString = closestFootprinter?.footprinterString ?? "soic8"
  const footprinterNote = closestFootprinter
    ? `${JSON.stringify(footprinterString)} is the closest footprinter match (${(
        closestFootprinter.copperIntersectionOverUnion * 100
      ).toFixed(2)}% copper IoU).`
    : `Replace ${JSON.stringify(footprinterString)} with the footprinter string for this part's package.`

  console.warn(
    kleur.yellow(
      [
        "Warning: No 3D model is available for this part.",
        `  Give the chip a footprinter model in ${filePath}:`,
        `    cadModel=${JSON.stringify(footprinterString)}`,
        `  ${footprinterNote}`,
        "  Docs: https://docs.tscircuit.com/footprints/footprinter-strings",
      ].join("\n"),
    ),
  )
}
