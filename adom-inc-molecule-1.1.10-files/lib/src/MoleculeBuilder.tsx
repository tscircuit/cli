import React from "react"

import { MachinePin, MachinePinProps } from "@tsci/adom-inc.library"
//import {MachineContact} from "@adom-footprint-library/src/MachineContact"

import {
  AvailableSizeIncrement,
  MoleculeSize,
  Point,
  MachinePin as MachinePinType,
  MoleculeProps,
  OptionalBoardProps,
  calculateMolecule,
  extractBoardProps,
} from "./MoleculeCalculator"

import { mm } from "@tscircuit/mm"

export type {
  MoleculeProps,
  MoleculeSizeString,
  OptionalBoardProps,
  MoleculeTemplateProps,
} from "./MoleculeCalculator"

//import MachineContactLargeUrl from "@adom-footprint-library/3D_Models/MachinePinMediumShort.glb"

export const MoleculeBuilder = (props: MoleculeProps) => {
  const {
    type = "4pin",
    size = "8x8",
    roundEdges = 0,
    wing = "0", //wing="0.2mm",
    pcbX = 0,
    pcbY = 0,
    debug = true, // Default: show debug margin boxes for transmitter molecules
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

  console.log("moleculeResult: ", moleculeResult)

  //function returnBorderRadius (moleculeResult.borderRadius)
  /*
    if (moleculeResult.borderRadius != 0) {
        elemBorderRadius={borderRadius=moleculeResult.borderRadius}
    } */

  // moleculeResult.machinePinType.size

  // Extract optional board props to spread into board element
  const boardProps = extractBoardProps(props)

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

  return (
    <board
      width={moleculeResult.boardWidth}
      height={moleculeResult.boardHeight}
      outlineOffsetX={moleculeResult.boardOffsetX}
      outlineOffsetY={moleculeResult.boardOffsetY}
      // boardAnchorPosition={{x:0, y:0}}    //rayfix hardcoded boardAnchorPosition 0,0 for now
      // boardAnchorAlignment="bottom_left"
      borderRadius={moleculeResult.borderRadius} //rayfix restore borderRadius after = 0 fix
      {...boardProps}
    >
      {moleculeResult.machinePins.map((pt) => (
        <MachinePin
          type={
            moleculeResult.machinePinType.fullName as MachinePinProps["type"]
          }
          // size={moleculeResult.machinePinType.size as MachinePinPropsWithSpecs["size"]}
          // length={moleculeResult.machinePinType.length as MachinePinPropsWithSpecs["length"]}
          name={pt.name}
          pcbX={pt.x}
          pcbY={pt.y}
        />
      ))}

      {/* Debug mode: Show blue margin boxes */}
      {debug &&
        moleculeResult.margins
          .filter((m) => !m.name.includes("Corner"))
          .map((margin, index) => {
            // Assign colors based on margin type and orientation
            let color
            if (
              margin.name === "topWingMargin" ||
              margin.name === "bottomWingMargin"
            ) {
              color = "#00FFFF" // Cyan for horizontal wing margins
            } else if (
              margin.name === "leftWingMargin" ||
              margin.name === "rightWingMargin"
            ) {
              color = "#0077FF" // Blue between standard and cyan for vertical wing margins
            } else {
              color = "#0000FF" // Standard blue for regular margins
            }
            return (
              // <group name={margin.name}>
              <pcbnoterect
                pcbX={margin.pcbX}
                pcbY={margin.pcbY}
                width={mm(margin.width) - 0.05}
                height={mm(margin.height) - 0.05}
                strokeWidth={0.05}
                color={color}
              />
              // </group>
            )
          })}

      {childrenWithMoleculeResult}
    </board>
  )
}

//if molecule special type "2pin" then only place MP1 and MP2 horizontally across from each other,
//otherwise default is 4pin rectangle
