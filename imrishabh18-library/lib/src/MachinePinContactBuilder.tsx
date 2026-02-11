import { mm } from "@tscircuit/mm"

import {
  MachinePinTypes,
  MachineContactTypes,
  MachinePinOrContactTypes,
  MachinePinContactSizes,
  mpcFormat,
  mpcParameters,
} from "./globals"

// import MachinePinMediumShort from "lib/3D_Models/MachinePinMediumShort.glb"
// import MachinePinMediumStandard from "lib/3D_Models/MachinePinMediumStandard.glb"
// import MachinePinLargeStandard from "lib/3D_Models/MachinePinLargeStandard.glb"
// import MachineContactMedium from "lib/3D_Models/MachineContactMedium.glb"
// import MachineContactLarge from "lib/3D_Models/MachineContactLarge.glb"

export interface MachinePinContactBasicParameters {
  pinOrContactType: MachinePinTypes | MachineContactTypes

  portHints?: string[]
  pcbX?: number | string
  pcbY?: number | string
  name: string
}

export const MachinePinOrContact = (
  props: MachinePinContactBasicParameters,
) => {
  const { portHints = [], pcbX = 0, pcbY = 0, name = "M1" } = props

  let mtype, msize, mlength

  if (!(props.pinOrContactType === undefined)) {
    ;[, mtype, msize, mlength] = props.pinOrContactType.split(/(?=[A-Z])/)
  }

  let holeID = MachinePinContactSizes[props.pinOrContactType].holeID
  let holeOD = MachinePinContactSizes[props.pinOrContactType].holeOD
  let glbPath = MachinePinContactSizes[props.pinOrContactType].glbPath
  let stepPath = MachinePinContactSizes[props.pinOrContactType].stepPath

  let boundingBoxSize =
    MachinePinContactSizes[props.pinOrContactType].boundingBox
  let boundingBoxColor =
    mtype == "Pin"
      ? "#ffd700"
      : mtype == "Contact"
        ? "#ffffff" //"#c0c0c0"
        : ""

  return (
    <chip
      footprint={
        <footprint>
          <platedhole
            portHints={["1"]}
            pcbX="0mm"
            pcbY="0mm"
            outerDiameter={holeOD}
            holeDiameter={holeID}
            shape="circle"
          />
          <pcbnotetext //silkscreentext
            pcbX={0}
            pcbY={0}
            anchorAlignment="center"
            fontSize={0.5}
            text={props.name ?? ""}
          />

          <pcbnoterect
            pcbX={0}
            pcbY={0}
            width={mm(boundingBoxSize) - 0.05}
            height={mm(boundingBoxSize) - 0.05}
            strokeWidth={0.05}
            color={boundingBoxColor}
          />
        </footprint>
      }
      cadModel={
        <cadassembly>
          <cadmodel
            modelUrl={stepPath}
            modelUnitToMmScale={1}
            positionOffset={{ x: 0, y: 0, z: 0 }}
          />
        </cadassembly>
      }
      {...props}
    />
  )
}
