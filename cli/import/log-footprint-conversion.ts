import kleur from "kleur"
import type { ImportComponentFromJlcpcbResult } from "lib/import/import-component-from-jlcpcb"

type FootprintConversion =
  ImportComponentFromJlcpcbResult["footprintConversion"]

export const logFootprintConversion = (conversion: FootprintConversion) => {
  if (conversion.mode === "footprinter" && conversion.candidate) {
    const accuracy = (
      conversion.candidate.copperIntersectionOverUnion * 100
    ).toFixed(2)
    console.log(
      kleur.dim(
        `Using footprinter "${conversion.candidate.footprinterString}" (${accuracy}% copper IoU).`,
      ),
    )
    return
  }

  if (conversion.mode === "exact-low-accuracy") {
    const accuracy =
      conversion.accuracy === undefined
        ? "no compatible match"
        : `${(conversion.accuracy * 100).toFixed(2)}% copper IoU`
    console.log(
      kleur.yellow(
        `Using the exact EasyEDA footprint because the best footprinter result had ${accuracy}.`,
      ),
    )
    return
  }

  if (conversion.mode === "exact-discovery-failed") {
    console.log(
      kleur.yellow(
        "Using the exact EasyEDA footprint because a safe footprinter pin mapping was not available.",
      ),
    )
  }
}
