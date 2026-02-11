import { mm } from "@tscircuit/mm"
import type { BoardProps } from "@tscircuit/props"

import { MachinePinTypes, MachinePinContactSizes } from "@tsci/adom-inc.library"

// Define the list of optional board properties once - single source of truth
// TypeScript ensures every key is a valid BoardProps key
const OPTIONAL_BOARD_PROP_KEYS: ReadonlyArray<keyof BoardProps> = [
  "autorouter",
  "title",
  "material",
  "layers",
  "thickness",
  "defaultTraceWidth",
  "minTraceWidth",
  "solderMaskColor",
  "topSolderMaskColor",
  "bottomSolderMaskColor",
  "silkscreenColor",
  "topSilkscreenColor",
  "bottomSilkscreenColor",
  "schematicDisabled",
  "pcbX",
  "pcbY",
] as const

// Derive the type from the keys array
export type OptionalBoardProps = Pick<
  BoardProps,
  (typeof OPTIONAL_BOARD_PROP_KEYS)[number]
>

// Helper to extract only OptionalBoardProps from any object
export function extractBoardProps<T extends Partial<OptionalBoardProps>>(
  props: T,
): Partial<OptionalBoardProps> {
  const result: any = {}
  for (const key of OPTIONAL_BOARD_PROP_KEYS) {
    if (key in props) {
      result[key] = props[key as keyof T]
    }
  }
  return result as Partial<OptionalBoardProps>
}

// export type AvailableSizeIncrement = 2 | 4 | 6 | 8 | 10 | 16 | 32 | 64 | 128
// export type MoleculeSize = `${AvailableSizeIncrement}x${AvailableSizeIncrement}`
// type MoleculeSizeString = MoleculeSize | `${MoleculeSize} absolute` | `${MoleculeSize} relative`;

//export type AvailableSizeIncrement = 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 32 | 64 | 128
export type AvailableSizeIncrement =
  | 2
  | 4
  | 6
  | 8
  | 10
  | 12
  | 14
  | 16
  | 18
  | 20
  | 22
  | 24
  | 26
  | 28
  | 30
  | 32
  | 40
  | 48
  | 56
  | 64
  | 72
  | 80
  | 88
  | 96
  | 128
  | 160
  | 192
  | 224
  | 256
  | 288
  | 320
  | 352
  | 384
  | 416
  | 448
  | 480
  | 512
  | 544
  | 576

export type AvailableAbsoluteSizeIncrement = number
export type MoleculeSize = `${AvailableSizeIncrement}x${AvailableSizeIncrement}`
export type MoleculeAbsoluteSize =
  `${AvailableAbsoluteSizeIncrement}x${AvailableAbsoluteSizeIncrement}`
export type MoleculeSizeString =
  | MoleculeSize
  | `${MoleculeAbsoluteSize} absolute`
  | `${MoleculeSize} relative`

export type WingSize = number | string | "nominal"
export type WingSizeString =
  | WingSize
  | `${WingSize} absolute`
  | `${WingSize} padding`
  | "nominal"
export const WingNominalAmountMolecule = "0.2mm"

export type RoundEdges = true | false | number | string

//export type MachinePinTypes = "MachinePinMediumStandard" | "MachinePinMediumShort" | "MachinePinLargeStandard"

// interface RelativeSizeParameter {
// }

// interface AbsoluteSizeParameter {
// }

//PCB X Y Size Parsing
export interface SizeParameter {
  width: AvailableSizeIncrement | AvailableAbsoluteSizeIncrement
  height: AvailableSizeIncrement | AvailableAbsoluteSizeIncrement
  suffix?: "absolute" | "relative"
}

//Size Parser function
export function parseSize(size: MoleculeSizeString): SizeParameter {
  const parts = size.split(" ")
  const dimensions = parts[0].split("x")

  return {
    width: parseInt(dimensions[0], 10) as AvailableSizeIncrement,
    height: parseInt(dimensions[1], 10) as AvailableSizeIncrement,
    suffix: parts[1] as "absolute" | "relative" | undefined, // undefined if no suffix, "absolute" if present.  undefined same as relative
  }
}

//Wing Parsing
interface WingSizeParameter {
  top: WingSize
  bottom: WingSize
  left: WingSize
  right: WingSize
  suffix?: "absolute" | "padding"
}

//Size Parser function - parses all wing props into unified structure
function parseWingSizes(
  wing?: WingSizeString,
  wingTop?: WingSizeString,
  wingBottom?: WingSizeString,
  wingLeft?: WingSizeString,
  wingRight?: WingSizeString,
): WingSizeParameter {
  // Helper to parse a single wing value
  const parseSingleWing = (
    size: WingSizeString,
  ): { value: WingSize; suffix?: "absolute" | "padding" } => {
    if (size === "nominal") {
      return {
        value: WingNominalAmountMolecule,
        suffix: undefined,
      }
    }

    if (typeof size === "number") {
      return {
        value: size,
        suffix: undefined,
      }
    }

    // Handle string input
    const parts = size.split(" ")

    return {
      value: parts[0], // Keep as string (e.g., "2", "2mm")
      suffix: parts[1] as "absolute" | "padding" | undefined,
    }
  }

  // Get the default wing value (from wing prop or 0)
  const defaultWing = wing !== undefined ? parseSingleWing(wing).value : 0
  const defaultSuffix =
    wing !== undefined ? parseSingleWing(wing).suffix : undefined

  // Resolve each side: individual prop > default > 0
  const top =
    wingTop !== undefined ? parseSingleWing(wingTop).value : defaultWing
  const bottom =
    wingBottom !== undefined ? parseSingleWing(wingBottom).value : defaultWing
  const left =
    wingLeft !== undefined ? parseSingleWing(wingLeft).value : defaultWing
  const right =
    wingRight !== undefined ? parseSingleWing(wingRight).value : defaultWing

  // For suffix, use the first defined suffix we find (prioritize individual props)
  let suffix = defaultSuffix
  if (wingTop !== undefined) suffix = parseSingleWing(wingTop).suffix || suffix
  if (wingBottom !== undefined)
    suffix = parseSingleWing(wingBottom).suffix || suffix
  if (wingLeft !== undefined)
    suffix = parseSingleWing(wingLeft).suffix || suffix
  if (wingRight !== undefined)
    suffix = parseSingleWing(wingRight).suffix || suffix

  return {
    top,
    bottom,
    left,
    right,
    suffix,
  }
}

export interface Point {
  x: number
  y: number
}

export interface MachinePin {
  name: string
  x: number
  y: number
}

export interface MarginBox {
  name: string
  pcbX: number
  pcbY: number
  width: number
  height: number
}

export interface MoleculeProps extends Partial<OptionalBoardProps> {
  children?: any
  type?: "2pin" | "4pin"
  size: MoleculeSizeString
  pinType: MachinePinTypes
  wing?: WingSizeString
  wingTop?: WingSizeString
  wingBottom?: WingSizeString
  wingLeft?: WingSizeString
  wingRight?: WingSizeString
  roundEdges?: RoundEdges
  pcbX?: number | string
  pcbY?: number | string
  debug?: boolean // Toggle debug visuals (margin boxes) - default: false
}

/**
 * Props accepted by generated Molecule template components.
 * These components are pre-configured variants that only accept
 * wing customization and children.
 */
export type MoleculeTemplateProps = Pick<
  MoleculeProps,
  | "wing"
  | "wingTop"
  | "wingBottom"
  | "wingLeft"
  | "wingRight"
  | "pcbX"
  | "pcbY"
  | "children"
>

export const calculateMolecule = (props: MoleculeProps) => {
  // const {
  //     type = "4pin",
  //     size = "8x8",
  //     wing = 0,
  //     pcbX = 0,
  //     pcbY = 0,
  // } = props

  console.log("props: ", props)
  //let molObj = p;
  //const [width, height] = props.size.split("x").map(Number)
  const width = parseSize(props.size).width
  const height = parseSize(props.size).height
  //const isSizeAbsolute = parseSize(props.size).suffix;
  const isSizeAbsolute =
    parseSize(props.size).suffix === undefined
      ? false
      : parseSize(props.size).suffix === "relative"
        ? false
        : true

  const pinType = props.pinType
  const [, mtype, msize, mlength] = pinType.split(/(?=[A-Z])/)
  console.log(
    "width: ",
    width,
    "height: ",
    height,
    "isSizeAbsolute: ",
    isSizeAbsolute,
  )
  console.log("pin: ", mtype, msize, mlength)

  // Parse all wing values
  const wingParams = parseWingSizes(
    props.wing,
    props.wingTop,
    props.wingBottom,
    props.wingLeft,
    props.wingRight,
  )
  console.log("wingParams:", wingParams)

  const isWingSizeAbsolute =
    wingParams.suffix === undefined
      ? false
      : wingParams.suffix === "padding"
        ? false
        : true

  //mtype = "Pin"    msize = "Medium"    mlength = "Standard"

  //Molecule Math here plz
  //use explicit wings to make medium vs large pin pcb size easier. 1mm/2mm and 3mm/6mm respectively.

  let pinBoundingBoxOffsetX, pinBoundingBoxOffsetY

  if (msize == "Medium") {
    pinBoundingBoxOffsetX = 2
    pinBoundingBoxOffsetY = 2
  } else if (msize == "Large") {
    pinBoundingBoxOffsetX = 6
    pinBoundingBoxOffsetY = 6
  } else {
    throw new Error("Molecule size not valid")
  }

  let boardNominalWidth, boardNominalHeight
  let boardWidth, boardHeight

  if (isSizeAbsolute) {
    boardNominalWidth = width
    boardNominalHeight = height
  } else {
    boardNominalWidth = width + pinBoundingBoxOffsetX
    boardNominalHeight = height + pinBoundingBoxOffsetY
  }

  //Wings (Buffalo Wild) - Now supports per-side wings
  if (isWingSizeAbsolute) {
    boardWidth =
      boardNominalWidth +
      mm(wingParams.left) +
      mm(wingParams.right) -
      pinBoundingBoxOffsetX
    boardHeight =
      boardNominalHeight +
      mm(wingParams.top) +
      mm(wingParams.bottom) -
      pinBoundingBoxOffsetY
  } else {
    boardWidth = boardNominalWidth + mm(wingParams.left) + mm(wingParams.right)
    boardHeight =
      boardNominalHeight + mm(wingParams.top) + mm(wingParams.bottom)
  }

  // Calculate board offset for asymmetric wings
  // When wings are asymmetric, shift the board so wings appear correctly
  // Positive offset = shift right/up, Negative = shift left/down
  const boardOffsetX = (mm(wingParams.right) - mm(wingParams.left)) / 2
  const boardOffsetY = (mm(wingParams.top) - mm(wingParams.bottom)) / 2

  //RoundEdges (borderRadius)
  //let roundEdges = props.roundEdges ? props.roundEdges : 0;
  let roundEdges = props.roundEdges
  let borderRadius: string | number = 0
  if (roundEdges) {
    if (roundEdges === true) {
      //borderRadius = 1.2  //rayfix hardcoded borderRadius later
      // Use nominal wing amount for border radius (consistent regardless of actual wing size)
      borderRadius =
        mm(MachinePinContactSizes[props.pinType].boundingBox) / 2 +
        mm(WingNominalAmountMolecule)
    } else if (typeof roundEdges == "number" || typeof roundEdges == "string") {
      borderRadius = mm(roundEdges)
    }
  } else {
    borderRadius = 0
  }
  //add logic for true and calculating default value

  //Pins (Discord Channel Style)
  let numPins
  let machinePins: MachinePin[] | undefined = undefined
  let leftMargin: MarginBox | null = null
  let rightMargin: MarginBox | null = null
  let topMargin: MarginBox | null = null
  let bottomMargin: MarginBox | null = null
  let centerMargin: MarginBox | null = null
  let topWingMargin: MarginBox | null = null
  let bottomWingMargin: MarginBox | null = null
  let leftWingMargin: MarginBox | null = null
  let rightWingMargin: MarginBox | null = null

  // Validate molecule type is provided
  if (!props.type) {
    throw new Error(
      `Molecule type is required but was not provided. ` +
        `Please specify type as either "2pin" or "4pin"`,
    )
  }

  if (props.type == "2pin") {
    //special case 2 pin horizontal rect molecule like Res/ Cap/ Jumper
    numPins = 2
    if (isSizeAbsolute) {
      let w = (width - pinBoundingBoxOffsetX) / 2
      let h = 0
      machinePins = [
        { name: "MP1", x: -w, y: h },
        { name: "MP2", x: w, y: h },
      ]
      // Center margin between the two pins
      let marginWidth = 2 * w - pinBoundingBoxOffsetX
      centerMargin = {
        name: "centerMargin",
        pcbX: 0,
        pcbY: 0,
        width: marginWidth,
        height: boardNominalHeight,
      }
    } else {
      let w = width / 2
      let h = 0
      machinePins = [
        { name: "MP1", x: -w, y: h },
        { name: "MP2", x: w, y: h },
      ]
      // Center margin between the two pins
      let marginWidth = 2 * w - pinBoundingBoxOffsetX
      centerMargin = {
        name: "centerMargin",
        pcbX: 0,
        pcbY: 0,
        width: marginWidth,
        height: boardNominalHeight,
      }
    }
  } else if (props.type == "4pin") {
    //normal 4 pin rect molecule
    numPins = 4
    if (isSizeAbsolute) {
      let w = (width - pinBoundingBoxOffsetX) / 2
      let h = (height - pinBoundingBoxOffsetY) / 2
      machinePins = [
        { name: "MP1", x: -w, y: -h },
        { name: "MP2", x: -w, y: h },
        { name: "MP3", x: w, y: h },
        { name: "MP4", x: w, y: -h },
      ]
      // Calculate margin boxes
      let innerWidth = boardNominalWidth - pinBoundingBoxOffsetX
      let innerHeight = boardNominalHeight - pinBoundingBoxOffsetY

      // Left margin (vertical rectangle on left side, between top and bottom pins)
      leftMargin = {
        name: "leftMargin",
        pcbX: -innerWidth / 2,
        pcbY: 0,
        width: pinBoundingBoxOffsetX,
        height: innerHeight - pinBoundingBoxOffsetY,
      }

      // Right margin (vertical rectangle on right side, between top and bottom pins)
      rightMargin = {
        name: "rightMargin",
        pcbX: innerWidth / 2,
        pcbY: 0,
        width: pinBoundingBoxOffsetX,
        height: innerHeight - pinBoundingBoxOffsetY,
      }

      // Top margin (horizontal rectangle on top, between left and right pins)
      topMargin = {
        name: "topMargin",
        pcbX: 0,
        pcbY: innerHeight / 2,
        width: innerWidth - pinBoundingBoxOffsetX,
        height: pinBoundingBoxOffsetY,
      }

      // Bottom margin (horizontal rectangle on bottom, between left and right pins)
      bottomMargin = {
        name: "bottomMargin",
        pcbX: 0,
        pcbY: -innerHeight / 2,
        width: innerWidth - pinBoundingBoxOffsetX,
        height: pinBoundingBoxOffsetY,
      }

      // Center margin (rectangle in the middle, surrounded by all four margins)
      centerMargin = {
        name: "centerMargin",
        pcbX: 0,
        pcbY: 0,
        width: innerWidth - pinBoundingBoxOffsetX,
        height: innerHeight - pinBoundingBoxOffsetY,
      }
    } else {
      let w = width / 2
      let h = height / 2
      machinePins = [
        { name: "MP1", x: -w, y: -h },
        { name: "MP2", x: -w, y: h },
        { name: "MP3", x: w, y: h },
        { name: "MP4", x: w, y: -h },
      ]
      // Calculate margin boxes
      let innerWidth = boardNominalWidth - pinBoundingBoxOffsetX
      let innerHeight = boardNominalHeight - pinBoundingBoxOffsetY

      // Left margin (vertical rectangle on left side, between top and bottom pins)
      leftMargin = {
        name: "leftMargin",
        pcbX: -innerWidth / 2,
        pcbY: 0,
        width: pinBoundingBoxOffsetX,
        height: innerHeight - pinBoundingBoxOffsetY,
      }

      // Right margin (vertical rectangle on right side, between top and bottom pins)
      rightMargin = {
        name: "rightMargin",
        pcbX: innerWidth / 2,
        pcbY: 0,
        width: pinBoundingBoxOffsetX,
        height: innerHeight - pinBoundingBoxOffsetY,
      }

      // Top margin (horizontal rectangle on top, between left and right pins)
      topMargin = {
        name: "topMargin",
        pcbX: 0,
        pcbY: innerHeight / 2,
        width: innerWidth - pinBoundingBoxOffsetX,
        height: pinBoundingBoxOffsetY,
      }

      // Bottom margin (horizontal rectangle on bottom, between left and right pins)
      bottomMargin = {
        name: "bottomMargin",
        pcbX: 0,
        pcbY: -innerHeight / 2,
        width: innerWidth - pinBoundingBoxOffsetX,
        height: pinBoundingBoxOffsetY,
      }

      // Center margin (rectangle in the middle, surrounded by all four margins)
      centerMargin = {
        name: "centerMargin",
        pcbX: 0,
        pcbY: 0,
        width: innerWidth - pinBoundingBoxOffsetX,
        height: innerHeight - pinBoundingBoxOffsetY,
      }
    }
  } else {
    throw new Error(
      `Invalid molecule type: "${props.type}". ` + `Expected "2pin" or "4pin"`,
    )
  }

  // Calculate full wing area margins (cover entire wing regions)
  // Round down each wing dimension to nearest 2mm multiple for grid alignment
  const topWingRounded = Math.floor(mm(wingParams.top) / 2) * 2
  const bottomWingRounded = Math.floor(mm(wingParams.bottom) / 2) * 2
  const leftWingRounded = Math.floor(mm(wingParams.left) / 2) * 2
  const rightWingRounded = Math.floor(mm(wingParams.right) / 2) * 2

  // Round down board dimensions to nearest 2mm multiple for wing margin sizing
  const boardWidthRounded = Math.floor(boardWidth / 2) * 2
  const boardHeightRounded = Math.floor(boardHeight / 2) * 2

  // Calculate grid-aligned offsets for wing margins (shift by 2mm increments only)
  // Based on rounded wing size differences
  const wingDiffX = rightWingRounded - leftWingRounded
  const wingMarginOffsetX = (Math.floor(wingDiffX / 2) * 2) / 2 // Shift right if right > left

  const wingDiffY = topWingRounded - bottomWingRounded
  const wingMarginOffsetY = (Math.floor(wingDiffY / 2) * 2) / 2 // Shift up if top > bottom

  if (topWingRounded >= 2) {
    topWingMargin = {
      name: "topWingMargin",
      pcbX: wingMarginOffsetX, // Use grid-aligned offset
      pcbY: boardNominalHeight / 2 + topWingRounded / 2,
      width: boardNominalWidth + leftWingRounded + rightWingRounded, // Span from outer left to outer right
      height: topWingRounded,
    }
  }

  if (bottomWingRounded >= 2) {
    bottomWingMargin = {
      name: "bottomWingMargin",
      pcbX: wingMarginOffsetX, // Use grid-aligned offset
      pcbY: -boardNominalHeight / 2 - bottomWingRounded / 2,
      width: boardNominalWidth + leftWingRounded + rightWingRounded, // Span from outer left to outer right
      height: bottomWingRounded,
    }
  }

  if (leftWingRounded >= 2) {
    leftWingMargin = {
      name: "leftWingMargin",
      pcbX: -boardNominalWidth / 2 - leftWingRounded / 2,
      pcbY: wingMarginOffsetY, // Use grid-aligned offset
      width: leftWingRounded,
      height: boardNominalHeight + topWingRounded + bottomWingRounded, // Span from outer top to outer bottom
    }
  }

  if (rightWingRounded >= 2) {
    rightWingMargin = {
      name: "rightWingMargin",
      pcbX: boardNominalWidth / 2 + rightWingRounded / 2,
      pcbY: wingMarginOffsetY, // Use grid-aligned offset
      width: rightWingRounded,
      height: boardNominalHeight + topWingRounded + bottomWingRounded, // Span from outer top to outer bottom
    }
  }

  // Build margins array (only include margins with non-zero dimensions)
  let margins: MarginBox[] = []
  if (leftMargin && leftMargin.width > 0 && leftMargin.height > 0)
    margins.push(leftMargin)
  if (rightMargin && rightMargin.width > 0 && rightMargin.height > 0)
    margins.push(rightMargin)
  if (topMargin && topMargin.width > 0 && topMargin.height > 0)
    margins.push(topMargin)
  if (bottomMargin && bottomMargin.width > 0 && bottomMargin.height > 0)
    margins.push(bottomMargin)
  if (centerMargin && centerMargin.width > 0 && centerMargin.height > 0)
    margins.push(centerMargin)
  if (topWingMargin && topWingMargin.width > 0 && topWingMargin.height > 0)
    margins.push(topWingMargin)
  if (
    bottomWingMargin &&
    bottomWingMargin.width > 0 &&
    bottomWingMargin.height > 0
  )
    margins.push(bottomWingMargin)
  if (leftWingMargin && leftWingMargin.width > 0 && leftWingMargin.height > 0)
    margins.push(leftWingMargin)
  if (
    rightWingMargin &&
    rightWingMargin.width > 0 &&
    rightWingMargin.height > 0
  )
    margins.push(rightWingMargin)

  // Wing edge margins (only created when wings exist)
  // These are positioned on the outer edges of wings, beyond the pin grid
  const wingEdgeMargins: MarginBox[] = []

  // For 4-pin molecules, add wing edge margins based on which wings exist
  if (props.type === "4pin" && machinePins) {
    const contactSize = pinBoundingBoxOffsetX // Use same size as pin bounding box

    // Top wing edges (only if wingTop >= contactSize, need at least 2mm for contact)
    if (mm(wingParams.top) >= contactSize) {
      // Top-left corner going up - aligned with MP1 (top-left pin)
      wingEdgeMargins.push({
        name: "topLeftCorner_Up",
        pcbX: machinePins[0].x, // Same X as MP1
        pcbY: boardNominalHeight / 2 + mm(wingParams.top) / 2, // Center of wing area
        width: contactSize,
        height: mm(wingParams.top),
      })

      // Top-right corner going up - aligned with MP4 (top-right pin)
      wingEdgeMargins.push({
        name: "topRightCorner_Up",
        pcbX: machinePins[3].x, // Same X as MP4
        pcbY: boardNominalHeight / 2 + mm(wingParams.top) / 2, // Center of wing area
        width: contactSize,
        height: mm(wingParams.top),
      })
    }

    // Bottom wing edges (only if wingBottom >= contactSize)
    if (mm(wingParams.bottom) >= contactSize) {
      // Bottom-left corner going down - aligned with MP2 (bottom-left pin)
      wingEdgeMargins.push({
        name: "bottomLeftCorner_Down",
        pcbX: machinePins[1].x, // Same X as MP2
        pcbY: -(boardNominalHeight / 2 + mm(wingParams.bottom) / 2), // Center of wing area
        width: contactSize,
        height: mm(wingParams.bottom),
      })

      // Bottom-right corner going down - aligned with MP3 (bottom-right pin)
      wingEdgeMargins.push({
        name: "bottomRightCorner_Down",
        pcbX: machinePins[2].x, // Same X as MP3
        pcbY: -(boardNominalHeight / 2 + mm(wingParams.bottom) / 2), // Center of wing area
        width: contactSize,
        height: mm(wingParams.bottom),
      })
    }

    // Left wing edges (only if wingLeft >= contactSize)
    if (mm(wingParams.left) >= contactSize) {
      // Top-left corner going left - aligned with MP1 (top-left pin)
      wingEdgeMargins.push({
        name: "topLeftCorner_Left",
        pcbX: -(boardNominalWidth / 2 + mm(wingParams.left) / 2), // Center of wing area
        pcbY: machinePins[0].y, // Same Y as MP1
        width: mm(wingParams.left),
        height: contactSize,
      })

      // Bottom-left corner going left - aligned with MP2 (bottom-left pin)
      wingEdgeMargins.push({
        name: "bottomLeftCorner_Left",
        pcbX: -(boardNominalWidth / 2 + mm(wingParams.left) / 2), // Center of wing area
        pcbY: machinePins[1].y, // Same Y as MP2
        width: mm(wingParams.left),
        height: contactSize,
      })
    }

    // Right wing edges (only if wingRight >= contactSize)
    if (mm(wingParams.right) >= contactSize) {
      // Top-right corner going right - aligned with MP4 (top-right pin)
      wingEdgeMargins.push({
        name: "topRightCorner_Right",
        pcbX: boardNominalWidth / 2 + mm(wingParams.right) / 2, // Center of wing area
        pcbY: machinePins[3].y, // Same Y as MP4
        width: mm(wingParams.right),
        height: contactSize,
      })

      // Bottom-right corner going right - aligned with MP3 (bottom-right pin)
      wingEdgeMargins.push({
        name: "bottomRightCorner_Right",
        pcbX: boardNominalWidth / 2 + mm(wingParams.right) / 2, // Center of wing area
        pcbY: machinePins[2].y, // Same Y as MP3
        width: mm(wingParams.right),
        height: contactSize,
      })
    }

    // Diagonal corners (positioned at true diagonal corners when wings exist)
    // Top-left diagonal corner (between top and left wings)
    if (
      mm(wingParams.top) >= contactSize &&
      mm(wingParams.left) >= contactSize
    ) {
      wingEdgeMargins.push({
        name: "topLeftCorner_Diagonal",
        pcbX: -(boardNominalWidth / 2 + mm(wingParams.left) / 2), // Left wing X position
        pcbY: boardNominalHeight / 2 + mm(wingParams.top) / 2, // Top wing Y position
        width: mm(wingParams.left),
        height: mm(wingParams.top),
      })
    }

    // Top-right diagonal corner (between top and right wings)
    if (
      mm(wingParams.top) >= contactSize &&
      mm(wingParams.right) >= contactSize
    ) {
      wingEdgeMargins.push({
        name: "topRightCorner_Diagonal",
        pcbX: boardNominalWidth / 2 + mm(wingParams.right) / 2, // Right wing X position
        pcbY: boardNominalHeight / 2 + mm(wingParams.top) / 2, // Top wing Y position
        width: mm(wingParams.right),
        height: mm(wingParams.top),
      })
    }

    // Bottom-left diagonal corner (between bottom and left wings)
    if (
      mm(wingParams.bottom) >= contactSize &&
      mm(wingParams.left) >= contactSize
    ) {
      wingEdgeMargins.push({
        name: "bottomLeftCorner_Diagonal",
        pcbX: -(boardNominalWidth / 2 + mm(wingParams.left) / 2), // Left wing X position
        pcbY: -(boardNominalHeight / 2 + mm(wingParams.bottom) / 2), // Bottom wing Y position
        width: mm(wingParams.left),
        height: mm(wingParams.bottom),
      })
    }

    // Bottom-right diagonal corner (between bottom and right wings)
    if (
      mm(wingParams.bottom) >= contactSize &&
      mm(wingParams.right) >= contactSize
    ) {
      wingEdgeMargins.push({
        name: "bottomRightCorner_Diagonal",
        pcbX: boardNominalWidth / 2 + mm(wingParams.right) / 2, // Right wing X position
        pcbY: -(boardNominalHeight / 2 + mm(wingParams.bottom) / 2), // Bottom wing Y position
        width: mm(wingParams.right),
        height: mm(wingParams.bottom),
      })
    }
  }

  // For 2-pin molecules, add left and right wing edge margins if they exist
  if (props.type === "2pin" && machinePins) {
    const contactSize = pinBoundingBoxOffsetX

    // Left wing edge (only if wingLeft >= contactSize)
    if (mm(wingParams.left) >= contactSize) {
      wingEdgeMargins.push({
        name: "topLeftCorner_Left",
        pcbX: -(boardNominalWidth / 2 + mm(wingParams.left) / 2), // Center of left wing area
        pcbY: 0, // Centered vertically (2-pin is horizontal)
        width: mm(wingParams.left),
        height: contactSize,
      })
    }

    // Right wing edge (only if wingRight >= contactSize)
    if (mm(wingParams.right) >= contactSize) {
      wingEdgeMargins.push({
        name: "topRightCorner_Right",
        pcbX: boardNominalWidth / 2 + mm(wingParams.right) / 2, // Center of right wing area
        pcbY: 0, // Centered vertically (2-pin is horizontal)
        width: mm(wingParams.right),
        height: contactSize,
      })
    }
  }

  // Append wing edge margins to the main margins array
  margins.push(...wingEdgeMargins)

  let molObj = {
    numPins: numPins,
    machinePinType: {
      fullName: pinType,
      type: mtype,
      size: msize,
      length: mlength,
    },
    //"machinePinTypeDestructured" : [, mtype, msize, mlength],
    machinePins: machinePins,
    boardNominalWidth: boardNominalWidth,
    boardNominalHeight: boardNominalHeight,
    boardWidth: boardWidth,
    boardHeight: boardHeight,
    borderRadius: borderRadius,
    boardOffsetX: boardOffsetX,
    boardOffsetY: boardOffsetY,
    margins: margins,
    wingParams: wingParams, // Include wing dimensions for asymmetric wing validation
  }
  return molObj
}

/*
let result = calculateMolecule (
    {
        type : "4pin",
        size : "32x32",   //size : "8x8",
        pinType: "MachinePinMediumStandard",
        wing : "2",   //wing="0.2mm",
        pcbX : 0,
        pcbY : 0,
    }
);

console.log ("result: " , result);
*/
