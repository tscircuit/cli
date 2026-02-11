import MachinePinMediumShortStepUrl from "lib/3D_Models/MachinePinMediumShort.step"
import MachinePinMediumStandardStepUrl from "lib/3D_Models/MachinePinMediumStandard.step"
import MachinePinLargeShortStepUrl from "lib/3D_Models/MachinePinLargeShort.step"
import MachinePinLargeStandardStepUrl from "lib/3D_Models/MachinePinLargeStandard.step"
import MachineContactMediumStepUrl from "lib/3D_Models/MachineContactMedium.step"
import MachineContactLargeStepUrl from "lib/3D_Models/MachineContactLarge.step"

export type MachinePinTypes =
  | "MachinePinMediumShort"
  | "MachinePinMediumStandard"
  | "MachinePinLargeShort"
  | "MachinePinLargeStandard"
export type MachineContactTypes = "MachineContactMedium" | "MachineContactLarge"

export type MachinePinOrContactTypes = MachinePinTypes | MachineContactTypes

export interface mpcParameters {
  holeID: number | string
  holeOD: number | string
  boundingBox: number | string
  glbPath?: string
  stepPath: string
}

export type mpcFormat = { [key in MachinePinOrContactTypes]: mpcParameters }

export const MachinePinContactSizes: mpcFormat = {
  MachinePinMediumShort: {
    holeID: "1.1mm",
    holeOD: "1.6mm",
    boundingBox: "2mm",
    stepPath: MachinePinMediumShortStepUrl,
  },
  MachinePinMediumStandard: {
    holeID: "1.1mm",
    holeOD: "1.6mm",
    boundingBox: "2mm",
    stepPath: MachinePinMediumStandardStepUrl,
  },
  MachinePinLargeShort: {
    holeID: "3.45mm",
    holeOD: "5.2mm",
    boundingBox: "6mm",
    stepPath: MachinePinLargeShortStepUrl,
  },
  MachinePinLargeStandard: {
    holeID: "3.45mm",
    holeOD: "5.2mm",
    boundingBox: "6mm",
    stepPath: MachinePinLargeStandardStepUrl,
  },
  MachineContactMedium: {
    holeID: "0.78mm",
    holeOD: "1.3mm",
    boundingBox: "2mm",
    stepPath: MachineContactMediumStepUrl,
  },
  MachineContactLarge: {
    holeID: "2.62mm",
    holeOD: "4.4mm",
    boundingBox: "6mm",
    stepPath: MachineContactLargeStepUrl,
  },
}
