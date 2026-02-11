import React from "react"

import { MachineContact, MachineContactProps } from "@tsci/imrishabh18.library"
import { MachinePinTypes, MachineContactTypes } from "@tsci/imrishabh18.library"

import {
  AvailableSizeIncrement,
  MoleculeSize,
  Point,
  MachinePin as MachinePinType,
  MoleculeProps,
  calculateMolecule,
} from "./MoleculeCalculator"

import { mm } from "@tscircuit/mm"

// Map MachinePinTypes to MachineContactTypes
const pinTypeToContactType = (
  pinType: MachinePinTypes,
): MachineContactTypes => {
  if (
    pinType === "MachinePinMediumStandard" ||
    pinType === "MachinePinMediumShort"
  ) {
    return "MachineContactMedium"
  } else if (pinType === "MachinePinLargeStandard") {
    return "MachineContactLarge"
  }
  throw new Error(`Unknown pin type: ${pinType}`)
}

// Keep original pin names (MP1 stays MP1, not MC1)
// This avoids naming conflicts with internal contacts from PackContacts
const pinNameToContactName = (pinName: string): string => {
  return pinName // Keep the same name
}

export const MoleculeReceiverBuilder = (props: MoleculeProps) => {
  const {
    type = "4pin",
    size = "8x8",
    roundEdges = 0,
    wing = "0", //wing="0.2mm",
    pcbX = 0,
    pcbY = 0,
    debug = false, // Default: hide debug margin boxes for receivers
  } = props

  let moleculeResult = calculateMolecule({
    type: props.type,
    size: props.size,
    pinType: props.pinType,
    roundEdges: props.roundEdges,
    wing: props.wing,
    wingTop: props.wingTop,
    wingBottom: props.wingBottom,
    wingLeft: props.wingLeft,
    wingRight: props.wingRight,
    pcbX: props.pcbX,
    pcbY: props.pcbY,
  })

  // console.log ("receiver result: " , moleculeResult);

  // Clone children and inject moleculeResult and debug props
  const childrenWithMoleculeResult = React.Children.map(
    props.children,
    (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          moleculeResult: moleculeResult,
          debug: debug,
        } as any)
      }
      return child
    },
  )

  // Convert pin type to contact type
  const contactType = pinTypeToContactType(
    moleculeResult.machinePinType.fullName as MachinePinTypes,
  )

  return (
    <group name="molecule-receiver">
      {/* Silkscreen rectangle representing the molecule board size */}
      <pcbnoterect
        pcbX={0}
        pcbY={0}
        width={moleculeResult.boardWidth}
        height={moleculeResult.boardHeight}
        layer="top"
      />

      {moleculeResult.machinePins.map((pt) => (
        <MachineContact
          type={contactType}
          name={pinNameToContactName(pt.name)}
          pcbX={pt.x}
          pcbY={pt.y}
        />
      ))}

      {/* Debug mode: Show red margin boxes */}
      {debug &&
        moleculeResult.margins.map((margin) => (
          <pcbnoterect
            pcbX={margin.pcbX}
            pcbY={margin.pcbY}
            width={mm(margin.width) - 0.05}
            height={mm(margin.height) - 0.05}
            strokeWidth={0.05}
            color="#FF0000"
          />
        ))}

      {childrenWithMoleculeResult}
    </group>
  )
}
