// ===== PackContacts.tsx =====
// Simplified contact placement with automatic designator generation (MC1, MC2, MC3...)

import {
  MachineContactMedium,
  MachineContactLarge,
} from "@tsci/imrishabh18.library"
import React, { useEffect, useRef } from "react"
import type { calculateMolecule } from "./MoleculeCalculator"
import {
  getMarginPositions,
  ContactSize,
  ContactPerpendicularShift,
  ContactAlign,
} from "./MoleculeMarginPacker"
import { mm } from "@tscircuit/mm"

// Valid spacing values: multiples of 2mm that are >= contact bounding box size
// For Medium contacts (2mm): 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32
// For Large contacts (6mm): 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32
export type ValidMediumSpacing =
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
export type ValidLargeSpacing =
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

// Gap can be any even number (positive or negative), but final spacing must be valid
// For Medium: gap can be 0, 2, 4, 6... (resulting spacing: 2, 4, 6, 8...)
// For Large: gap can be 0, 2, 4, 6... (resulting spacing: 6, 8, 10, 12...)
export type ValidMediumGap =
  | 0
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
export type ValidLargeGap =
  | 0
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

// Padding: even number offset applied after align positioning
// Positive padding = clockwise/right direction, negative padding = counterclockwise/left direction
export type ValidPadding =
  | -30
  | -28
  | -26
  | -24
  | -22
  | -20
  | -18
  | -16
  | -14
  | -12
  | -10
  | -8
  | -6
  | -4
  | -2
  | 0
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

// Import MoleculeSize type from MoleculeCalculator
import type { MoleculeSize } from "./MoleculeCalculator"

// Gap specifier for custom one-off gaps between specific contacts
export interface GapSpecifierMedium {
  gap: ValidMediumGap
}

export interface GapSpecifierLarge {
  gap: ValidLargeGap
}

// Molecule gap specifier - extracts first dimension from molecule size string (e.g., "6x2" -> 6mm gap)
export interface MoleculeGapSpecifier {
  moleculeBySize: MoleculeSize
  rotation?: 0 | 90 | 180 | 270 // Rotation in degrees (increments of 90)
}

export type GapSpecifier =
  | GapSpecifierMedium
  | GapSpecifierLarge
  | MoleculeGapSpecifier

// Contact array element: either a contact name (string) or a gap specifier
export type ContactOrGap = string | GapSpecifier

// Contacts array - can contain contact names and gap/molecule specifiers
// Gaps at start/end are allowed and just create spacing at the edges
export type ContactsArray = ContactOrGap[]

// ===== New Elements API =====
// Explicit element types for cleaner configuration
export interface ContactElement {
  contact: string // Net name (e.g., "VCC", "GND")
  size?: ContactSize // "Medium" or "Large" (defaults to margin config)
}

export interface GapElement {
  gap: number // Gap size in mm (even number)
}

export interface MoleculeElement {
  moleculeBySize: MoleculeSize // Size string like "6x2"
  rotation?: 0 | 90 | 180 | 270 // Rotation in degrees
}

export interface MoleculeComponentElement {
  molecule: React.ComponentType<any> // The imported molecule component
  props?: Record<string, any> // Props to pass to the component
  rotation?: 0 | 90 | 180 | 270 // Optional rotation
}

// Fill specifier - auto-fill remaining margin capacity with numbered contacts
export interface FillElement {
  fill: "remaining" | number // "remaining" fills all available space, number fills exact count
}

// Space specifier - auto-sized gap that fills remaining space in margin
export interface SpaceElement {
  space: "remaining" // Auto-sized gap that fills all leftover space
}

export type ElementSpec =
  | ContactElement
  | GapElement
  | MoleculeElement
  | MoleculeComponentElement
  | FillElement
  | SpaceElement

// Elements array - explicit specification of contacts, gaps, molecules, and fill
export type ElementsArray = ElementSpec[]

// Unified element type - everything is just "something that takes up space"
type Element =
  | { type: "contact"; name: string; size: number }
  | {
      type: "molecule"
      spec: MoleculeGapSpecifier
      width: number
      height: number
    }
  | {
      type: "moleculeComponent"
      component: React.ComponentType<any>
      props?: any
      width: number
      height: number
      rotation: number
    }
  | { type: "gap"; size: number }

// Positioned element - element with calculated position
type PositionedElement = {
  element: Element
  position: number // Position along primary axis (from margin start)
}

export interface MarginConfigBase {
  contacts?: ContactsArray // Can contain contacts and gaps/molecules. Gaps at start/end create spacing at the edges.
  elements?: ElementsArray // Explicit element specification (cannot use both contacts and elements)
  perpendicularShift?: ContactPerpendicularShift
  align?: ContactAlign
  padding?: ValidPadding // Shift contact group along primary axis (positive = clockwise, negative = counterclockwise)
}

export interface MarginConfigMedium extends MarginConfigBase {
  contactSize?: "Medium"
  spacing?: ValidMediumSpacing // Absolute spacing in mm between contact centers (must be >= 2mm and multiple of 2mm)
  gap?: ValidMediumGap // Additional gap in mm (added to default 2mm spacing, must be even)
}

export interface MarginConfigLarge extends MarginConfigBase {
  contactSize: "Large"
  spacing?: ValidLargeSpacing // Absolute spacing in mm between contact centers (must be >= 6mm and multiple of 2mm)
  gap?: ValidLargeGap // Additional gap in mm (added to default 6mm spacing, must be even)
}

export type MarginConfig = MarginConfigMedium | MarginConfigLarge

export interface MoleculeInfo {
  name: string // Molecule size string (e.g., "10x4")
  pcbX: number // Center X position
  pcbY: number // Center Y position
  width: number // Width in mm
  height: number // Height in mm
  rotation: number // Rotation in degrees (0, 90, 180, 270)
  margin: string // Which margin it's on (e.g., "leftMargin")
}

export interface PackContactsProps {
  /**
   * Simple array of contact names to distribute across all margins
   * Example: ["VCC", "GND", "TX", "RX"]
   * Can also include gap/molecule specifiers: ["VCC", { gap: 4 }, "GND", { moleculeBySize: "6x2" }]
   * Gaps at start/end create spacing at the edges: [{ gap: 2 }, "VCC", "GND", { gap: 2 }]
   */
  contacts?: ContactsArray

  /**
   * Optional callback to receive molecule information after rendering
   * Called with an array of all detected molecules and their positions
   */
  onMoleculesDetected?: (molecules: MoleculeInfo[]) => void

  /**
   * Or specify contacts per margin with their names (simple)
   * Example: { leftMargin: ["VCC", "GND"], topMargin: ["TX", "RX"] }
   * Can include gap/molecule specifiers anywhere: { leftMargin: [{ moleculeBySize: "4x2" }, "VCC", { gap: 4 }, "3V3", { gap: 2 }] }
   * Molecules are treated as gaps + visualization rectangles
   */
  leftMargin?: ContactsArray | MarginConfig
  topMargin?: ContactsArray | MarginConfig
  rightMargin?: ContactsArray | MarginConfig
  bottomMargin?: ContactsArray | MarginConfig
  centerMargin?: ContactsArray | MarginConfig

  /**
   * Wing area margins (only available when wings >= 2mm)
   * These margins cover the entire wing regions
   */
  topWingMargin?: ContactsArray | MarginConfig
  bottomWingMargin?: ContactsArray | MarginConfig
  leftWingMargin?: ContactsArray | MarginConfig
  rightWingMargin?: ContactsArray | MarginConfig

  /**
   * Wing edge margins (only available when wings exist)
   * These margins are on the outer edges of wings, beyond the pin grid
   */
  topLeftCorner_Up?: ContactsArray | MarginConfig
  topRightCorner_Up?: ContactsArray | MarginConfig
  bottomLeftCorner_Down?: ContactsArray | MarginConfig
  bottomRightCorner_Down?: ContactsArray | MarginConfig
  topLeftCorner_Left?: ContactsArray | MarginConfig
  bottomLeftCorner_Left?: ContactsArray | MarginConfig
  topRightCorner_Right?: ContactsArray | MarginConfig
  bottomRightCorner_Right?: ContactsArray | MarginConfig

  /**
   * Diagonal corner margins (only available when both adjacent wings exist)
   * These fill the diagonal corner spaces between wings
   */
  topLeftCorner_Diagonal?: ContactsArray | MarginConfig
  topRightCorner_Diagonal?: ContactsArray | MarginConfig
  bottomLeftCorner_Diagonal?: ContactsArray | MarginConfig
  bottomRightCorner_Diagonal?: ContactsArray | MarginConfig

  size?: ContactSize // Default size: "Medium" or "Large" (default: "Medium")
  perpendicularShift?: ContactPerpendicularShift // Default perpendicularShift: "outer" | "center" | "inner" (default: "center")
  align?: ContactAlign // Default align: "left" | "center" | "right" (default: "center")
  component?: React.ComponentType<{ name: string; pcbX: number; pcbY: number }>
  moleculeResult?: ReturnType<typeof calculateMolecule> // Auto-injected by Molecule
  debug?: boolean // Show molecule placeholder rectangles (default: false for receivers, true for transmitters)
}

/**
 * Simplified contact placement with automatic designator numbering (MC1, MC2, MC3...).
 *
 * @example
 * Simple auto-distribution:
 * ```tsx
 * <PackContacts contacts={["VCC", "GND", "TX", "RX"]} />
 * ```
 *
 * @example
 * Specify margins explicitly with simple arrays:
 * ```tsx
 * <PackContacts
 *   leftMargin={["VCC", "GND"]}
 *   topMargin={["TX", "RX", "CLK"]}
 * />
 * ```
 *
 * @example
 * Specify per-margin size, perpendicularShift, and align:
 * ```tsx
 * <PackContacts
 *   leftMargin={{ contacts: ["VCC", "GND"], size: "Large", perpendicularShift: "outer", align: "left" }}
 *   topMargin={{ contacts: ["TX", "RX"], size: "Medium", perpendicularShift: "center", align: "center" }}
 * />
 * ```
 *
 * @example
 * Custom spacing between contacts (must be >= contact size and multiple of 2mm):
 * ```tsx
 * <PackContacts
 *   leftMargin={{ contacts: ["A", "B", "C"], spacing: 4 }}  // 4mm between contact centers (valid for Medium)
 *   topMargin={{ contacts: ["TX", "RX"], gap: 2 }}  // Add 2mm to default 2mm spacing = 4mm total
 *   rightMargin={{ contacts: ["D", "E"], spacing: 8 }}  // 8mm spacing (valid)
 * />
 * ```
 *
 * @example
 * Padding to shift contact group along primary axis (positive = clockwise, negative = counterclockwise):
 * ```tsx
 * <PackContacts
 *   leftMargin={{ contacts: ["A", "B"], align: "left", padding: 4 }}     // Start at bottom-left, push up 4mm (clockwise)
 *   topMargin={{ contacts: ["TX", "RX"], align: "center", padding: 2 }}  // Centered, push right 2mm (clockwise)
 *   rightMargin={{ contacts: ["D", "E"], align: "right", padding: 4 }}   // Start at top-right, push down 4mm (clockwise)
 *   bottomMargin={{ contacts: ["GND"], align: "center", padding: -4 }}   // Centered, pull right 4mm (counterclockwise)
 * />
 * ```
 *
 * @example
 * Custom per-contact gaps (gap = space between bounding boxes, not centers):
 * ```tsx
 * <PackContacts
 *   leftMargin={{ contacts: ["VCC", { gap: 4 }, "3V3", "GND"] }}  // 4mm space between boxes
 *   topMargin={{ contacts: ["TX", { moleculeBySize: "6x2" }, "RX", "CLK"] }}  // 6mm gap (from "6x2")
 *   rightMargin={{ contacts: ["D1", { moleculeBySize: "4x2" }, "D2"] }}  // 4mm gap (from "4x2")
 *   bottomMargin={{ contacts: ["GND", { moleculeBySize: "10x4", rotation: 90 }, "VCC"] }}  // 10mm gap, rotated 90°
 * />
 * ```
 *
 * @example
 * Fill remaining margin capacity with auto-generated contacts using "*FILL*" marker:
 * ```tsx
 * <PackContacts
 *   leftMargin={["VCC", "GND", "*FILL*"]}  // VCC, GND, then fill rest with MC3, MC4, MC5...
 *   rightMargin={["*FILL*"]}  // Fill entire margin with MC6, MC7, MC8...
 * />
 * ```
 *
 * @example
 * Fill specific count using elements syntax:
 * ```tsx
 * <PackContacts
 *   leftMargin={{ elements: [
 *     { contact: "VCC" },
 *     { contact: "GND" },
 *     { fill: "remaining" }  // Fill all remaining space
 *   ]}}
 *   rightMargin={{ elements: [
 *     { fill: 5 }  // Fill with exactly 5 auto-generated contacts
 *   ]}}
 * />
 * ```
 *
 * @example
 * Auto-sized gap using "*SPACE*" marker:
 * ```tsx
 * <PackContacts
 *   leftMargin={["VCC", "*SPACE*", "GND"]}  // VCC at bottom, GND at top, auto-sized gap between
 *   rightMargin={{ elements: [
 *     { contact: "D1" },
 *     { space: "remaining" },  // Elements syntax
 *     { contact: "D2" }
 *   ]}}
 * />
 * ```
 */
export const PackContacts: React.FC<PackContactsProps> = ({
  contacts,
  leftMargin,
  topMargin,
  rightMargin,
  bottomMargin,
  centerMargin,
  topWingMargin,
  bottomWingMargin,
  leftWingMargin,
  rightWingMargin,
  topLeftCorner_Up,
  topRightCorner_Up,
  bottomLeftCorner_Down,
  bottomRightCorner_Down,
  topLeftCorner_Left,
  bottomLeftCorner_Left,
  topRightCorner_Right,
  bottomRightCorner_Right,
  topLeftCorner_Diagonal,
  topRightCorner_Diagonal,
  bottomLeftCorner_Diagonal,
  bottomRightCorner_Diagonal,
  size = "Medium",
  perpendicularShift = "center",
  align = "center",
  component: ContactComponent,
  moleculeResult,
  onMoleculesDetected,
  debug = true, // Default: show molecule placeholders (set to false in receivers)
}) => {
  if (!moleculeResult) {
    console.error(
      "PackContacts requires moleculeResult prop (automatically injected by Molecule)",
    )
    return null
  }

  const pinSize = moleculeResult.machinePinType.size // "Medium" or "Large"

  // Helper to check if an element is a gap specifier (gap or moleculeBySize)
  const isGapSpecifier = (item: ContactOrGap): item is GapSpecifier => {
    return (
      typeof item === "object" &&
      item !== null &&
      ("gap" in item || "moleculeBySize" in item)
    )
  }

  // Helper to get molecule dimensions after rotation
  const getMoleculeDimensions = (
    spec: MoleculeGapSpecifier,
  ): { width: number; height: number } => {
    const match = spec.moleculeBySize.match(/^(\d+)x(\d+)$/)
    if (!match) {
      console.error(
        `Invalid molecule size format: ${spec.moleculeBySize}. Expected format like "6x2".`,
      )
      return { width: 0, height: 0 }
    }

    const baseWidth = parseInt(match[1], 10)
    const baseHeight = parseInt(match[2], 10)
    const rotation = spec.rotation ?? 0

    // Apply rotation to get final dimensions
    if (rotation === 90 || rotation === 270) {
      return { width: baseHeight, height: baseWidth }
    } else {
      return { width: baseWidth, height: baseHeight }
    }
  }

  // Helper to extract size from molecule component name
  // e.g., "Molecule_R_0402_4x2" → { width: 4, height: 2 }
  const getMoleculeSizeFromComponent = (
    Component: React.ComponentType<any>,
  ): { width: number; height: number } => {
    const name = Component.name || (Component as any).displayName || ""
    const match = name.match(/(\d+)x(\d+)/)

    if (!match) {
      console.error(
        `Cannot determine size from molecule component name: ${name}. Expected format like "Molecule_R_0402_4x2".`,
      )
      return { width: 4, height: 2 } // Default fallback
    }

    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10),
    }
  }

  // Helper to extract gap value from a gap specifier
  // For molecules, apply rotation first, then extract the first dimension as the gap
  const extractGapValue = (gapSpec: GapSpecifier): number => {
    if ("gap" in gapSpec) {
      return gapSpec.gap
    } else if ("moleculeBySize" in gapSpec) {
      const dims = getMoleculeDimensions(gapSpec)
      return dims.width // Gap is the width (first dimension after rotation)
    }
    return 0
  }

  // Helper function to calculate margin capacity
  // Returns the maximum number of contacts that can fit in a margin
  const calculateMarginCapacity = (
    margin: { width: number; height: number },
    marginName: string,
    contactBoundingBoxSize: number,
    spacing?: number,
    gap?: number,
  ): number => {
    // Determine if margin is vertical (runs along Y axis) - must match calculateElementPositions logic
    const isVertical =
      marginName === "leftMargin" ||
      marginName === "rightMargin" ||
      marginName === "leftWingMargin" ||
      marginName === "rightWingMargin" ||
      marginName === "topLeftCorner_Up" ||
      marginName === "topRightCorner_Up" ||
      marginName === "bottomLeftCorner_Down" ||
      marginName === "bottomRightCorner_Down"
    const dimension = isVertical ? margin.height : margin.width
    const effectiveSpacing =
      spacing ??
      (gap !== undefined
        ? contactBoundingBoxSize + gap
        : contactBoundingBoxSize)
    return Math.floor(dimension / effectiveSpacing)
  }

  // Preprocessor to expand "*SPACE*" markers into auto-sized gaps
  // This runs BEFORE parseToElements and calculates remaining space
  const expandSpaceMarkers = (
    input: ContactsArray | ElementsArray,
    margin: { width: number; height: number },
    marginName: string,
    contactBoundingBoxSize: number,
    spacing?: number,
    gap?: number,
  ): ContactsArray | ElementsArray => {
    // Check if there are any space markers
    const hasSpaceMarker = input.some(
      (item) =>
        (typeof item === "string" && item === "*SPACE*") ||
        (typeof item === "object" && item !== null && "space" in item),
    )

    if (!hasSpaceMarker) {
      return input // No space markers, return as-is
    }

    // Count space markers
    let spaceMarkerCount = 0
    for (const item of input) {
      if (
        (typeof item === "string" && item === "*SPACE*") ||
        (typeof item === "object" && item !== null && "space" in item)
      ) {
        spaceMarkerCount++
      }
    }

    // Validate: only one space marker allowed per margin
    if (spaceMarkerCount > 1) {
      console.error(
        `Invalid configuration: Only one *SPACE* marker allowed per margin (found ${spaceMarkerCount} in ${marginName})`,
      )
      return input // Return unchanged
    }

    // Calculate total used space (excluding space markers)
    const isVertical =
      marginName === "leftMargin" || marginName === "rightMargin"
    const availableSpace = isVertical ? margin.height : margin.width

    let usedSpace = 0
    for (const item of input) {
      // Skip space markers
      if (
        (typeof item === "string" && item === "*SPACE*") ||
        (typeof item === "object" && item !== null && "space" in item)
      ) {
        continue
      }

      // Count contacts
      if (typeof item === "string") {
        usedSpace += contactBoundingBoxSize
      } else if (
        typeof item === "object" &&
        item !== null &&
        "contact" in item
      ) {
        usedSpace += contactBoundingBoxSize
      }
      // Count gaps
      else if (
        typeof item === "object" &&
        item !== null &&
        "gap" in item &&
        !("contact" in item)
      ) {
        usedSpace += (item as any).gap
      }
      // Count molecules
      else if (
        typeof item === "object" &&
        item !== null &&
        "moleculeBySize" in item
      ) {
        const dims = getMoleculeDimensions(item as MoleculeGapSpecifier)
        usedSpace += dims.width
      }
    }

    // Calculate remaining space
    const remainingSpace = Math.max(0, availableSpace - usedSpace)

    // Expand space markers into gap elements
    const expanded: any[] = []
    for (const item of input) {
      if (typeof item === "string" && item === "*SPACE*") {
        // Replace with gap of remaining space
        expanded.push({ gap: remainingSpace })
      } else if (typeof item === "object" && item !== null && "space" in item) {
        // Replace with gap element
        expanded.push({ gap: remainingSpace })
      } else {
        expanded.push(item)
      }
    }

    return expanded as ContactsArray | ElementsArray
  }

  // Preprocessor to expand "*FILL*" markers into actual contact arrays
  // This runs BEFORE parseToElements and expands fill markers into contact names
  // Supports: *FILL*, *FILL_OUTER*, *FILL_INNER*, *FILL_LARGE*
  const expandFillMarkers = (
    input: ContactsArray | ElementsArray,
    margin: { width: number; height: number },
    marginName: string,
    contactBoundingBoxSize: number,
    spacing?: number,
    gap?: number,
  ): {
    expanded: ContactsArray | ElementsArray
    perpendicularShift?: "inner" | "outer" | "center"
    contactSize?: "Medium" | "Large"
    align?: ContactAlign
  } => {
    // Check if there are any fill markers
    const hasFillMarker = input.some(
      (item) =>
        (typeof item === "string" &&
          (item === "*FILL*" ||
            item === "*FILL_OUTER*" ||
            item === "*FILL_INNER*" ||
            item === "*FILL_LARGE*")) ||
        (typeof item === "object" && item !== null && "fill" in item),
    )

    if (!hasFillMarker) {
      return { expanded: input } // No fill markers, return as-is
    }

    // Check if *FILL_LARGE* is present to determine correct contact size for capacity calculation
    const hasLargeFillMarker = input.some(
      (item) => typeof item === "string" && item === "*FILL_LARGE*",
    )
    const effectiveContactSize = hasLargeFillMarker ? 6 : contactBoundingBoxSize

    // Calculate margin capacity with the correct contact size
    const capacity = calculateMarginCapacity(
      margin,
      marginName,
      effectiveContactSize,
      spacing,
      gap,
    )

    // Count existing contacts (not gaps/molecules)
    let existingContactCount = 0
    for (const item of input) {
      if (
        typeof item === "string" &&
        item !== "*FILL*" &&
        item !== "*FILL_OUTER*" &&
        item !== "*FILL_INNER*" &&
        item !== "*FILL_LARGE*"
      ) {
        existingContactCount++
      } else if (
        typeof item === "object" &&
        item !== null &&
        "contact" in item
      ) {
        existingContactCount++
      }
    }

    // Calculate how many contacts to fill
    const remainingCapacity = capacity - existingContactCount

    if (remainingCapacity < 0) {
      console.error(
        `Invalid configuration: Too many contacts for ${marginName}. ` +
          `Capacity: ${capacity}, Requested contacts: ${existingContactCount}`,
      )
      return { expanded: input } // Return original to trigger proper error handling downstream
    }

    // Expand the fill markers
    const expanded: (ContactOrGap | ElementSpec)[] = []
    let fillContactCounter = 1 // Will be replaced with actual MC designator later
    let fillMarkersFound = 0
    let detectedPerpendicularShift: "inner" | "outer" | "center" | undefined =
      undefined
    let detectedContactSize: "Medium" | "Large" | undefined = undefined
    let detectedAlign: ContactAlign | undefined = undefined

    for (const item of input) {
      // Check for "*FILL*", "*FILL_OUTER*", "*FILL_INNER*", "*FILL_LARGE*" string markers
      if (
        typeof item === "string" &&
        (item === "*FILL*" ||
          item === "*FILL_OUTER*" ||
          item === "*FILL_INNER*" ||
          item === "*FILL_LARGE*")
      ) {
        fillMarkersFound++
        if (fillMarkersFound > 1) {
          console.error(
            `Multiple "*FILL*" markers found in ${marginName}. Only one fill marker is allowed per margin.`,
          )
          continue // Skip additional fill markers
        }

        // Extract perpendicular shift from marker variant
        if (item === "*FILL_OUTER*") {
          detectedPerpendicularShift = "outer"
        } else if (item === "*FILL_INNER*") {
          detectedPerpendicularShift = "inner"
        }
        // *FILL* leaves detectedPerpendicularShift as undefined

        // Extract contact size and auto-apply pin-symmetrical alignment from marker variant
        if (item === "*FILL_LARGE*") {
          detectedContactSize = "Large"
          detectedAlign = "pin-symmetrical" // Auto-apply pin-symmetrical alignment for large contacts
        }
        // Other fill markers leave detectedContactSize as undefined (use margin default)

        // Generate contact names for remaining capacity
        if (remainingCapacity > 0) {
          for (let i = 0; i < remainingCapacity; i++) {
            expanded.push(`*AUTOFILL_${fillContactCounter++}*`) // Temporary name, will be replaced
          }
        } else if (remainingCapacity === 0) {
          console.warn(
            `"*FILL*" marker in ${marginName} has no space to fill (margin at full capacity)`,
          )
        }
      }
      // Check for { fill: ... } element
      else if (typeof item === "object" && item !== null && "fill" in item) {
        const fillItem = item as FillElement
        fillMarkersFound++
        if (fillMarkersFound > 1) {
          console.error(
            `Multiple fill markers found in ${marginName}. Only one fill marker is allowed per margin.`,
          )
          continue // Skip additional fill markers
        }

        let fillCount = 0
        if (fillItem.fill === "remaining") {
          fillCount = remainingCapacity
        } else if (typeof fillItem.fill === "number") {
          fillCount = fillItem.fill
          // Validate that requested fill doesn't exceed capacity
          if (existingContactCount + fillCount > capacity) {
            console.error(
              `Invalid configuration: Fill count (${fillCount}) plus existing contacts (${existingContactCount}) ` +
                `exceeds margin capacity (${capacity}) in ${marginName}`,
            )
            fillCount = Math.max(0, remainingCapacity)
          }
        }

        // Generate contact elements for fill
        if (fillCount > 0) {
          for (let i = 0; i < fillCount; i++) {
            expanded.push({ contact: `*AUTOFILL_${fillContactCounter++}*` }) // Temporary name
          }
        } else if (fillCount === 0) {
          console.warn(`Fill marker in ${marginName} has no space to fill`)
        }
      }
      // Regular item, keep as-is
      else {
        expanded.push(item)
      }
    }

    return {
      expanded: expanded as ContactsArray | ElementsArray,
      perpendicularShift: detectedPerpendicularShift,
      contactSize: detectedContactSize,
      align: detectedAlign,
    }
  }

  // Parse either ContactsArray or ElementsArray directly into unified Element[] format
  // This is the core parser that handles both old and new syntax without conversion
  // Returns: { leadingGap, elements[], trailingGap, contactNames }
  // All gaps/molecules at start become leadingGap, all at end become trailingGap
  const parseToElements = (
    input: ContactsArray | ElementsArray,
    contactBoundingBoxSize: number,
  ): {
    leadingGap: number
    elements: Element[]
    trailingGap: number
    contactNames: string[] // Contact names for designator generation
  } => {
    const elements: Element[] = []
    const contactNames: string[] = []
    let leadingGap = 0
    let trailingGap = 0

    // First pass: accumulate leading gaps
    let i = 0
    while (i < input.length) {
      const item = input[i]

      // Check if it's a gap, molecule placeholder, or molecule component (works for both syntaxes)
      const isGap =
        typeof item === "object" &&
        item !== null &&
        "gap" in item &&
        !("contact" in item)
      const isMoleculePlaceholder =
        typeof item === "object" && item !== null && "moleculeBySize" in item
      const isMoleculeComponent =
        typeof item === "object" &&
        item !== null &&
        "molecule" in item &&
        typeof (item as any).molecule === "function"

      if (isGap || isMoleculePlaceholder || isMoleculeComponent) {
        if (isMoleculePlaceholder) {
          const moleculeSpec = item as MoleculeGapSpecifier | MoleculeElement
          const dims = getMoleculeDimensions(moleculeSpec)
          leadingGap += dims.width
        } else if (isMoleculeComponent) {
          const moleculeItem = item as MoleculeComponentElement
          const baseSize = getMoleculeSizeFromComponent(moleculeItem.molecule)
          const rotation = moleculeItem.rotation ?? 0
          const dims =
            rotation === 90 || rotation === 270
              ? { width: baseSize.height, height: baseSize.width }
              : baseSize
          leadingGap += dims.width
        } else if (isGap) {
          // Extract gap value (handles both GapSpecifier and GapElement)
          const gapItem = item as any
          leadingGap += gapItem.gap
        }
        i++
      } else {
        break // Found first contact
      }
    }

    // Second pass: process middle elements (contacts, gaps, molecules)
    while (i < input.length) {
      const item = input[i]

      if (typeof item === "string") {
        // Old syntax: contact name string
        elements.push({
          type: "contact",
          name: item,
          size: contactBoundingBoxSize,
        })
        contactNames.push(item)
      } else if (typeof item === "object" && item !== null) {
        if ("contact" in item) {
          // New syntax: { contact: "VCC", size?: "Medium" | "Large" }
          // If size is specified on the contact, use it; otherwise use margin default
          const contactSize =
            item.size === "Large"
              ? 6
              : item.size === "Medium"
                ? 2
                : contactBoundingBoxSize
          elements.push({
            type: "contact",
            name: item.contact,
            size: contactSize,
          })
          contactNames.push(item.contact)
        } else if (
          "molecule" in item &&
          typeof (item as any).molecule === "function"
        ) {
          // New syntax: { molecule: Component, props: {...}, rotation?: 90 }
          const moleculeItem = item as MoleculeComponentElement
          const baseSize = getMoleculeSizeFromComponent(moleculeItem.molecule)
          const rotation = moleculeItem.rotation ?? 0
          const dims =
            rotation === 90 || rotation === 270
              ? { width: baseSize.height, height: baseSize.width }
              : baseSize

          elements.push({
            type: "moleculeComponent",
            component: moleculeItem.molecule,
            props: moleculeItem.props,
            width: dims.width,
            height: dims.height,
            rotation: rotation,
          })
        } else if ("moleculeBySize" in item) {
          // Both syntaxes: { moleculeBySize: "6x2", rotation?: 90 }
          const moleculeSpec = item as MoleculeGapSpecifier | MoleculeElement
          const dims = getMoleculeDimensions(moleculeSpec)
          elements.push({
            type: "molecule",
            spec: moleculeSpec,
            width: dims.width,
            height: dims.height,
          })
        } else if ("gap" in item) {
          // Both syntaxes: { gap: 2 }
          elements.push({
            type: "gap",
            size: item.gap,
          })
        }
      }
      i++
    }

    // Third pass: convert trailing gaps/molecules to trailingGap
    while (elements.length > 0) {
      const lastElement = elements[elements.length - 1]
      if (lastElement.type === "gap") {
        trailingGap += lastElement.size
        elements.pop()
        // Don't remove from contactNames since gaps don't add contacts
      } else if (lastElement.type === "molecule") {
        trailingGap += lastElement.width
        elements.pop()
        // Don't remove from contactNames since molecules don't add contacts
      } else if (lastElement.type === "moleculeComponent") {
        trailingGap += lastElement.width
        elements.pop()
        // Don't remove from contactNames since molecule components don't add contacts
      } else {
        break // Stop at last contact
      }
    }

    return { leadingGap, elements, trailingGap, contactNames }
  }

  // Get the input array from a margin config (supports both contacts and elements)
  const getInputArray = (
    marginConfig: MarginConfig,
  ): ContactsArray | ElementsArray => {
    if (marginConfig.elements) {
      // Validation: can't use both contacts and elements
      if (marginConfig.contacts) {
        console.error(
          "Cannot use both contacts and elements in the same margin config",
        )
        return []
      }
      return marginConfig.elements
    }
    return marginConfig.contacts || []
  }

  // Legacy parseContacts function - keep for now for backward compatibility
  // TODO: Remove once all code is migrated to parseContactsToElements
  const parseContacts = (
    contactsArray: ContactsArray,
  ): {
    contactNames: string[]
    customGaps: Map<number, number>
    moleculesAfter: Map<number, MoleculeGapSpecifier>
    leadingGap: number
    trailingGap: number
  } => {
    const contactNames: string[] = []
    const customGaps = new Map<number, number>()
    const moleculesAfter = new Map<number, MoleculeGapSpecifier>()
    let leadingGap = 0
    let trailingGap = 0

    for (let i = 0; i < contactsArray.length; i++) {
      const item = contactsArray[i]

      if (isGapSpecifier(item)) {
        const gapValue = extractGapValue(item)

        if (contactNames.length === 0) {
          leadingGap += gapValue
        } else {
          const previousContactIndex = contactNames.length - 1
          const existingGap = customGaps.get(previousContactIndex) || 0
          customGaps.set(previousContactIndex, existingGap + gapValue)

          if ("moleculeBySize" in item) {
            moleculesAfter.set(previousContactIndex, item)
          }
        }
      } else {
        contactNames.push(item as string)
      }
    }

    if (contactsArray.length > 0) {
      const lastItem = contactsArray[contactsArray.length - 1]
      if (isGapSpecifier(lastItem)) {
        const gapValue = extractGapValue(lastItem)
        if (contactNames.length > 0) {
          const lastContactIndex = contactNames.length - 1
          const lastContactGap = customGaps.get(lastContactIndex) || 0
          customGaps.set(lastContactIndex, lastContactGap - gapValue)
          if (customGaps.get(lastContactIndex) === 0) {
            customGaps.delete(lastContactIndex)
          }
          moleculesAfter.delete(lastContactIndex)
        }
        trailingGap = gapValue
      }
    }

    return { contactNames, customGaps, moleculesAfter, leadingGap, trailingGap }
  }

  // Distribute gaps symmetrically for center-symmetrical alignment
  // Takes leftover space and returns an array of gap elements to insert
  const distributeGapsSymmetrically = (
    leftoverSpace: number,
    contactBoundingBoxSize: number,
  ): Array<{ type: "gap"; size: number }> => {
    if (leftoverSpace <= 0) {
      return []
    }

    // Ensure leftoverSpace is multiple of 2mm (should already be from grid alignment)
    const roundedLeftover = Math.floor(leftoverSpace / 2) * 2

    if (roundedLeftover === 0) {
      return []
    }

    // Strategy:
    // - 2mm: single 2mm gap in center
    // - 4mm: 2mm gap at each end
    // - 6mm: 2mm at each end + 2mm in center
    // - 8mm+: 4mm at each end, remainder in center (or distribute evenly)

    const gaps: Array<{ type: "gap"; size: number }> = []

    if (roundedLeftover === 2) {
      // Single center gap
      gaps.push({ type: "gap", size: 2 })
    } else if (roundedLeftover === 4) {
      // Edge gaps only (will be added as leading/trailing)
      // Return empty - will be handled via alignmentOffset
      return []
    } else if (roundedLeftover === 6) {
      // Center gap (edge gaps handled separately)
      gaps.push({ type: "gap", size: 2 })
    } else {
      // 8mm+: distribute with preference for edge gaps
      // Put 2mm at each end, remainder in center
      const centerGap = roundedLeftover - 4 // Reserve 2mm for each edge
      if (centerGap > 0) {
        gaps.push({ type: "gap", size: centerGap })
      }
    }

    return gaps
  }

  // Distribute gaps for pin-symmetrical alignment
  // Strategy: Insert gap in center to align first and last contacts to corner machine pins
  // For odd number of contacts: split gap asymmetrically to center the middle contact
  const distributeGapsPinSymmetrically = (
    elements: Element[],
    leftoverSpace: number,
    margin: { pcbX: number; pcbY: number; width: number; height: number },
    marginName: string,
    machinePins: Array<{ name: string; x: number; y: number }> | undefined,
    isVertical: boolean,
    contactBoundingBoxSize: number,
  ): Array<{ type: "gap"; size: number }> => {
    if (leftoverSpace <= 0 || !machinePins) {
      return []
    }

    // Ensure leftoverSpace is multiple of 2mm
    const roundedLeftover = Math.floor(leftoverSpace / 2) * 2

    if (roundedLeftover === 0) {
      return []
    }

    // Count actual contact elements (not gaps or molecules)
    const contactCount = elements.filter((el) => el.type === "contact").length
    const gaps: Array<{ type: "gap"; size: number }> = []

    // For even number of contacts: insert entire gap in center (symmetric)
    if (contactCount % 2 === 0) {
      if (roundedLeftover >= 2) {
        gaps.push({ type: "gap", size: roundedLeftover })
      }
    } else {
      // For odd number of contacts: split gap to center the middle contact
      // Middle contact should be as close to geometric center as possible (on 2mm grid)

      // Try to shift middle contact by 2mm increments to center it
      // Split total gap into gap before middle and gap after middle

      // For odd contacts, we want to shift the middle contact toward center
      // Test different 2mm shifts and pick the one closest to center
      let bestGap1 = 0
      let bestGap2 = 0

      // Simple approach: try to balance the gap
      // If total gap is divisible by 4, split evenly
      // Otherwise, make one side 2mm larger
      if (roundedLeftover >= 4 && roundedLeftover % 4 === 0) {
        // Evenly divisible by 4: split evenly
        bestGap1 = roundedLeftover / 2
        bestGap2 = roundedLeftover / 2
      } else if (roundedLeftover >= 4) {
        // Not evenly divisible: make gaps differ by 2mm
        bestGap1 = Math.floor(roundedLeftover / 2 / 2) * 2 // Round down to even
        bestGap2 = roundedLeftover - bestGap1
      } else {
        // Small gap (2mm): put it all on one side
        bestGap1 = roundedLeftover
        bestGap2 = 0
      }

      // Add gaps in order: gap before middle, then gap after middle
      if (bestGap1 >= 2) {
        gaps.push({ type: "gap", size: bestGap1 })
      }
      if (bestGap2 >= 2) {
        gaps.push({ type: "gap", size: bestGap2 })
      }
    }

    return gaps
  }

  // Calculate positions for all elements in a margin
  // Returns array of positioned elements with their calculated coordinates
  const calculateElementPositions = (
    elements: Element[],
    leadingGap: number,
    trailingGap: number,
    margin: { pcbX: number; pcbY: number; width: number; height: number },
    marginName: string,
    align: ContactAlign,
    padding: number | undefined,
    perpendicularShift: ContactPerpendicularShift,
    contactBoundingBoxSize: number,
    machinePins?: Array<{ name: string; x: number; y: number }>,
  ): Array<{ element: Element; pcbX: number; pcbY: number }> => {
    // Use margin as-is for now
    const effectiveMargin = margin

    // Determine if margin is vertical (runs along Y axis)
    // For diagonal corners, determine orientation based on dimensions
    let isVertical: boolean

    if (
      marginName === "topLeftCorner_Diagonal" ||
      marginName === "topRightCorner_Diagonal" ||
      marginName === "bottomLeftCorner_Diagonal" ||
      marginName === "bottomRightCorner_Diagonal"
    ) {
      // Diagonal corners: determine orientation from margin dimensions
      // If height > width, contacts align vertically (along Y-axis)
      // If width > height, contacts align horizontally (along X-axis)
      isVertical = margin.height > margin.width
    } else {
      isVertical =
        marginName === "leftMargin" ||
        marginName === "rightMargin" ||
        marginName === "leftWingMargin" ||
        marginName === "rightWingMargin" ||
        marginName === "topLeftCorner_Up" ||
        marginName === "topRightCorner_Up" ||
        marginName === "bottomLeftCorner_Down" ||
        marginName === "bottomRightCorner_Down"
    }

    // Determine direction: "forward" starts from beginning of margin, "reverse" starts from end
    // For wing edges, we want contacts closest to the board center (inner edge)
    // For vertical margins: "forward" = bottom, "reverse" = top
    // For horizontal margins: "forward" = left, "reverse" = right
    let direction: "forward" | "reverse"
    if (marginName === "rightMargin" || marginName === "bottomMargin") {
      direction = "reverse"
    } else if (
      marginName === "rightWingMargin" ||
      marginName === "bottomWingMargin"
    ) {
      // Right/bottom wing margins: start from inner edge (close to board center)
      direction = "reverse"
    } else if (
      marginName === "topLeftCorner_Up" ||
      marginName === "topRightCorner_Up"
    ) {
      // Top wing edges: start from bottom (close to board center), these are VERTICAL
      direction = "forward"
    } else if (
      marginName === "bottomLeftCorner_Down" ||
      marginName === "bottomRightCorner_Down"
    ) {
      // Bottom wing edges: start from top (close to board center), these are VERTICAL
      direction = "reverse"
    } else if (
      marginName === "topLeftCorner_Left" ||
      marginName === "bottomLeftCorner_Left"
    ) {
      // Left wing edges: start from right (close to board center), these are HORIZONTAL
      direction = "reverse"
    } else if (marginName === "topLeftCorner_Diagonal") {
      // Top-left diagonal: start from inner corner (closest to pins)
      // If vertical: start from bottom (forward), If horizontal: start from right (reverse)
      direction = isVertical ? "forward" : "reverse"
    } else if (marginName === "topRightCorner_Diagonal") {
      // Top-right diagonal: start from inner corner (closest to pins)
      // If vertical: start from bottom (forward), If horizontal: start from left (forward)
      direction = "forward"
    } else if (marginName === "bottomLeftCorner_Diagonal") {
      // Bottom-left diagonal: start from inner corner (closest to pins)
      // If vertical: start from top (reverse), If horizontal: start from right (reverse)
      direction = "reverse"
    } else if (marginName === "bottomRightCorner_Diagonal") {
      // Bottom-right diagonal: start from inner corner (closest to pins)
      // If vertical: start from top (reverse), If horizontal: start from left (forward)
      direction = isVertical ? "reverse" : "forward"
    } else {
      // leftMargin, topMargin, topRightCorner_Right, bottomRightCorner_Right all use "forward"
      direction = "forward"
    }

    // Calculate total used space
    let totalUsedSpace = leadingGap + trailingGap
    for (const element of elements) {
      if (element.type === "contact") {
        totalUsedSpace += element.size
      } else if (
        element.type === "molecule" ||
        element.type === "moleculeComponent"
      ) {
        totalUsedSpace += element.width // Width is along primary axis
      } else if (element.type === "gap") {
        totalUsedSpace += element.size
      }
    }

    const availableSpace = isVertical ? margin.height : margin.width
    const leftoverSpace = availableSpace - totalUsedSpace

    // Normalize align
    const normalizedAlign =
      align === "ccw" || align === "counterclockwise"
        ? "left"
        : align === "cw" || align === "clockwise"
          ? "right"
          : align === "c"
            ? "center"
            : align === "sb"
              ? "space-between"
              : align === "cs"
                ? "center-symmetrical"
                : align === "ps"
                  ? "pin-symmetrical"
                  : align

    // Handle center-symmetrical: insert gaps into elements array
    let modifiedElements = elements
    if (normalizedAlign === "center-symmetrical" && leftoverSpace > 0) {
      const symmetricalGaps = distributeGapsSymmetrically(
        leftoverSpace,
        contactBoundingBoxSize,
      )

      if (symmetricalGaps.length > 0) {
        // Insert center gap(s) in the middle of the elements array
        const halfIndex = Math.floor(elements.length / 2)
        modifiedElements = [
          ...elements.slice(0, halfIndex),
          ...symmetricalGaps,
          ...elements.slice(halfIndex),
        ]
      }
    }

    // Handle pin-symmetrical: insert gaps to align first and last contacts to corner pins
    if (normalizedAlign === "pin-symmetrical" && leftoverSpace > 0) {
      const pinSymmetricalGaps = distributeGapsPinSymmetrically(
        elements,
        leftoverSpace,
        margin,
        marginName,
        machinePins,
        isVertical,
        contactBoundingBoxSize,
      )

      if (pinSymmetricalGaps.length > 0) {
        // Count contact elements to determine insertion strategy
        const contactCount = elements.filter(
          (el) => el.type === "contact",
        ).length

        if (contactCount % 2 === 0) {
          // Even number of contacts: insert all gaps at center
          const halfIndex = Math.floor(elements.length / 2)
          modifiedElements = [
            ...elements.slice(0, halfIndex),
            ...pinSymmetricalGaps,
            ...elements.slice(halfIndex),
          ]
        } else {
          // Odd number of contacts: insert gaps around middle contact
          // For odd contacts, we have two gaps to insert at different positions
          const middleContactIndex = Math.floor(contactCount / 2)

          // Find the element index of the middle contact
          let contactsSeen = 0
          let middleElementIndex = 0
          for (let i = 0; i < elements.length; i++) {
            if (elements[i].type === "contact") {
              if (contactsSeen === middleContactIndex) {
                middleElementIndex = i
                break
              }
              contactsSeen++
            }
          }

          // Insert first gap before middle contact, second gap after middle contact
          if (pinSymmetricalGaps.length === 1) {
            // Only one gap: insert it at the center
            const halfIndex = Math.floor(elements.length / 2)
            modifiedElements = [
              ...elements.slice(0, halfIndex),
              pinSymmetricalGaps[0],
              ...elements.slice(halfIndex),
            ]
          } else if (pinSymmetricalGaps.length === 2) {
            // Two gaps: insert around middle contact
            modifiedElements = [
              ...elements.slice(0, middleElementIndex),
              pinSymmetricalGaps[0],
              elements[middleElementIndex],
              pinSymmetricalGaps[1],
              ...elements.slice(middleElementIndex + 1),
            ]
          }
        }
      }
    }

    // Calculate alignment offset
    let alignmentOffset = 0
    if (normalizedAlign === "center") {
      alignmentOffset = Math.round(leftoverSpace / 2 / 2) * 2
    } else if (normalizedAlign === "left") {
      alignmentOffset = 0
    } else if (normalizedAlign === "right") {
      alignmentOffset = leftoverSpace
    } else if (normalizedAlign === "space-between") {
      // space-between: no offset, handled in element positioning loop below
      alignmentOffset = 0
    } else if (normalizedAlign === "center-symmetrical") {
      // center-symmetrical: calculate edge gap offset (2mm per edge for leftover >= 4mm)
      const roundedLeftover = Math.floor(leftoverSpace / 2) * 2
      if (roundedLeftover >= 4) {
        // 2mm gap at each end
        alignmentOffset = 2
      } else if (roundedLeftover === 2) {
        // All gap in center, no edge offset
        alignmentOffset = 0
      } else {
        // No leftover, treat as center
        alignmentOffset = Math.round(leftoverSpace / 2 / 2) * 2
      }
    } else if (normalizedAlign === "pin-symmetrical") {
      // pin-symmetrical: no edge offset, contacts should be flush with margin edges
      // The gap in the center will handle the spacing
      alignmentOffset = 0
    }

    // Apply padding (not applicable for space-between)
    if (padding !== undefined && normalizedAlign !== "space-between") {
      alignmentOffset += padding
    }

    // Calculate perpendicular shift
    let perpendicularShiftAmount = 0

    // Special handling for wing margins: default to inner edge positioning
    const wingMargins = [
      "topWingMargin",
      "bottomWingMargin",
      "leftWingMargin",
      "rightWingMargin",
    ]
    const isWingMargin = wingMargins.includes(marginName)
    let effectivePerpendicularShift = perpendicularShift

    // Override default "center" to "inner" for wing margins
    if (isWingMargin && perpendicularShift === "center") {
      effectivePerpendicularShift = "inner"
    }

    if (typeof effectivePerpendicularShift === "number") {
      // Numeric shift: use value directly
      // Positive values shift away from center, negative shift toward center

      // Diagonal corners need special handling based on orientation
      if (
        marginName === "topLeftCorner_Diagonal" ||
        marginName === "topRightCorner_Diagonal" ||
        marginName === "bottomLeftCorner_Diagonal" ||
        marginName === "bottomRightCorner_Diagonal"
      ) {
        // For diagonal corners, the sign is already baked into the calculated value
        perpendicularShiftAmount = effectivePerpendicularShift
      } else {
        // For standard margins, apply direction multiplier
        const direction =
          marginName === "leftMargin" || marginName === "bottomMargin" ? -1 : 1
        perpendicularShiftAmount = direction * effectivePerpendicularShift
      }
    } else if (effectivePerpendicularShift !== "center") {
      // String shift: use fixed ±2mm
      let shiftAwayFromCenter = 0
      if (marginName === "leftMargin") shiftAwayFromCenter = -2
      else if (marginName === "rightMargin") shiftAwayFromCenter = 2
      else if (marginName === "topMargin") shiftAwayFromCenter = 2
      else if (marginName === "bottomMargin") shiftAwayFromCenter = -2
      // Wing margins: shift toward board center by (wingDimension - contactSize) / 2
      else if (marginName === "leftWingMargin") {
        const wingWidth = effectiveMargin.width
        shiftAwayFromCenter = -(wingWidth - contactBoundingBoxSize) / 2 // Away = left (-X), inner will negate to +X
      } else if (marginName === "rightWingMargin") {
        const wingWidth = effectiveMargin.width
        shiftAwayFromCenter = (wingWidth - contactBoundingBoxSize) / 2 // Away = right (+X), inner will negate to -X
      } else if (marginName === "topWingMargin") {
        const wingHeight = effectiveMargin.height
        shiftAwayFromCenter = (wingHeight - contactBoundingBoxSize) / 2 // Away = up (+Y), inner will negate to -Y
      } else if (marginName === "bottomWingMargin") {
        const wingHeight = effectiveMargin.height
        shiftAwayFromCenter = -(wingHeight - contactBoundingBoxSize) / 2 // Away = down (-Y), inner will negate to +Y
      }
      // Diagonal corners: shift perpendicular to primary axis toward inner corner
      else if (marginName === "topLeftCorner_Diagonal") {
        shiftAwayFromCenter = isVertical ? 2 : -2 // Vertical: shift right (+X), Horizontal: shift down (-Y)
      } else if (marginName === "topRightCorner_Diagonal") {
        shiftAwayFromCenter = isVertical ? -2 : -2 // Vertical: shift left (-X), Horizontal: shift down (-Y)
      } else if (marginName === "bottomLeftCorner_Diagonal") {
        shiftAwayFromCenter = isVertical ? 2 : 2 // Vertical: shift right (+X), Horizontal: shift up (+Y)
      } else if (marginName === "bottomRightCorner_Diagonal") {
        shiftAwayFromCenter = isVertical ? -2 : 2 // Vertical: shift left (-X), Horizontal: shift up (+Y)
      }

      if (effectivePerpendicularShift === "outer") {
        perpendicularShiftAmount = shiftAwayFromCenter
      } else if (effectivePerpendicularShift === "inner") {
        perpendicularShiftAmount = -shiftAwayFromCenter
      }
    }

    // Position each element sequentially
    let positioned: Array<{ element: Element; pcbX: number; pcbY: number }> = []

    // Special handling for space-between: distribute elements across entire margin
    if (normalizedAlign === "space-between") {
      if (modifiedElements.length === 0) {
        return positioned
      } else if (modifiedElements.length === 1) {
        // Single element: center it
        const element = modifiedElements[0]
        let elementSize = 0
        if (element.type === "contact") {
          elementSize = element.size
        } else if (
          element.type === "molecule" ||
          element.type === "moleculeComponent"
        ) {
          elementSize = element.width
        } else if (element.type === "gap") {
          elementSize = element.size
        }

        const contactOffset = elementSize / 2

        if (isVertical) {
          positioned.push({
            element,
            pcbX: effectiveMargin.pcbX + perpendicularShiftAmount,
            pcbY: effectiveMargin.pcbY,
          })
        } else {
          positioned.push({
            element,
            pcbX: effectiveMargin.pcbX,
            pcbY: effectiveMargin.pcbY + perpendicularShiftAmount,
          })
        }
      } else {
        // Multiple elements: first at start, last at end, middle distributed evenly
        // Calculate total element sizes to account for them in distribution
        let totalElementSize = 0
        for (const element of modifiedElements) {
          if (element.type === "contact") {
            totalElementSize += element.size
          } else if (
            element.type === "molecule" ||
            element.type === "moleculeComponent"
          ) {
            totalElementSize += element.width
          } else if (element.type === "gap") {
            totalElementSize += element.size
          }
        }

        // Available space for positioning (centers of elements)
        const contactOffset =
          modifiedElements[0].type === "contact"
            ? modifiedElements[0].size / 2
            : contactBoundingBoxSize / 2
        const spaceBetween =
          (availableSpace -
            totalElementSize +
            (modifiedElements.length > 1
              ? modifiedElements[0].type === "contact"
                ? modifiedElements[0].size
                : contactBoundingBoxSize
              : 0)) /
          (modifiedElements.length - 1)

        let currentPos = 0
        for (let i = 0; i < modifiedElements.length; i++) {
          const element = modifiedElements[i]
          let elementSize = 0
          if (element.type === "contact") {
            elementSize = element.size
          } else if (
            element.type === "molecule" ||
            element.type === "moleculeComponent"
          ) {
            elementSize = element.width
          } else if (element.type === "gap") {
            elementSize = element.size
          }

          const elementCenter = currentPos + elementSize / 2

          let pcbX: number, pcbY: number

          if (isVertical) {
            const y =
              direction === "forward"
                ? effectiveMargin.pcbY -
                  effectiveMargin.height / 2 +
                  contactOffset +
                  currentPos
                : effectiveMargin.pcbY +
                  effectiveMargin.height / 2 -
                  contactOffset -
                  currentPos
            pcbX = effectiveMargin.pcbX + perpendicularShiftAmount
            pcbY = y
          } else {
            const x =
              direction === "forward"
                ? effectiveMargin.pcbX -
                  effectiveMargin.width / 2 +
                  contactOffset +
                  currentPos
                : effectiveMargin.pcbX +
                  effectiveMargin.width / 2 -
                  contactOffset -
                  currentPos
            pcbX = x
            pcbY = effectiveMargin.pcbY + perpendicularShiftAmount
          }

          positioned.push({ element, pcbX, pcbY })
          currentPos += elementSize + spaceBetween
        }
      }
    } else {
      // Standard sequential positioning for left/center/right/center-symmetrical align
      let currentPos = leadingGap

      for (const element of modifiedElements) {
        // Get element size along primary axis
        let elementSize = 0
        if (element.type === "contact") {
          elementSize = element.size
        } else if (
          element.type === "molecule" ||
          element.type === "moleculeComponent"
        ) {
          elementSize = element.width
        } else if (element.type === "gap") {
          elementSize = element.size
        }

        // Calculate element center position along primary axis
        const elementCenter = currentPos + elementSize / 2

        // Calculate perpendicular shift for this specific element
        let elementPerpendicularShift = perpendicularShiftAmount

        // For molecules larger than contact size, shift inward to keep on board
        if (
          element.type === "molecule" ||
          element.type === "moleculeComponent"
        ) {
          const moleculePerpendicularSize = element.height // Height is perpendicular to primary axis
          if (moleculePerpendicularSize > contactBoundingBoxSize) {
            const shiftInward =
              (moleculePerpendicularSize - contactBoundingBoxSize) / 2
            if (marginName === "leftMargin") {
              elementPerpendicularShift += shiftInward // Shift right
            } else if (marginName === "rightMargin") {
              elementPerpendicularShift -= shiftInward // Shift left
            } else if (marginName === "topMargin") {
              elementPerpendicularShift -= shiftInward // Shift down
            } else if (marginName === "bottomMargin") {
              elementPerpendicularShift += shiftInward // Shift up
            }
          }
        }

        // Calculate final pcbX and pcbY
        let pcbX: number, pcbY: number

        if (isVertical) {
          // Vertical margin: primary axis is Y, perpendicular is X
          const y =
            direction === "forward"
              ? effectiveMargin.pcbY -
                effectiveMargin.height / 2 +
                alignmentOffset +
                elementCenter
              : effectiveMargin.pcbY +
                effectiveMargin.height / 2 -
                alignmentOffset -
                elementCenter
          pcbX = effectiveMargin.pcbX + elementPerpendicularShift
          pcbY = y
        } else {
          // Horizontal margin: primary axis is X, perpendicular is Y
          const x =
            direction === "forward"
              ? effectiveMargin.pcbX -
                effectiveMargin.width / 2 +
                alignmentOffset +
                elementCenter
              : effectiveMargin.pcbX +
                effectiveMargin.width / 2 -
                alignmentOffset -
                elementCenter
          pcbX = x
          pcbY = effectiveMargin.pcbY + elementPerpendicularShift
        }

        positioned.push({ element, pcbX, pcbY })

        // Move to next element position
        currentPos += elementSize
      }
    }

    // For diagonal corners, calculate separate X and Y shifts based on adjacent wing sizes
    if (
      marginName === "topLeftCorner_Diagonal" ||
      marginName === "topRightCorner_Diagonal" ||
      marginName === "bottomLeftCorner_Diagonal" ||
      marginName === "bottomRightCorner_Diagonal"
    ) {
      // Extract individual wing dimensions
      const wingParams = moleculeResult.wingParams
      const wingLeft = wingParams ? mm(wingParams.left) : 0
      const wingRight = wingParams ? mm(wingParams.right) : 0
      const wingTop = wingParams ? mm(wingParams.top) : 0
      const wingBottom = wingParams ? mm(wingParams.bottom) : 0

      let offsetX = 0
      let offsetY = 0

      if (marginName === "topLeftCorner_Diagonal") {
        // Top-left: shift left (away from center) based on left wing, shift down based on top wing
        // offsetX = -(wingLeft - contactBoundingBoxSize -1) / 2;
        offsetY = -(wingTop - contactBoundingBoxSize) / 2
      } else if (marginName === "topRightCorner_Diagonal") {
        // Top-right: shift right (away from center) based on right wing, shift down based on top wing
        // offsetX = (wingRight - contactBoundingBoxSize-1) / 2;
        offsetY = -(wingTop - contactBoundingBoxSize) / 2
      } else if (marginName === "bottomLeftCorner_Diagonal") {
        // Bottom-left: shift left (away from center) based on left wing, shift up based on bottom wing
        // offsetX = -(wingLeft - contactBoundingBoxSize-1) / 2;
        offsetY = (wingBottom - contactBoundingBoxSize) / 2
      } else if (marginName === "bottomRightCorner_Diagonal") {
        // Bottom-right: shift right (away from center) based on right wing, shift up based on bottom wing
        // offsetX = (wingRight - contactBoundingBoxSize-1) / 2;
        offsetY = (wingBottom - contactBoundingBoxSize) / 2
      }

      positioned = positioned.map((p) => ({
        ...p,
        pcbX: p.pcbX + offsetX,
        pcbY: p.pcbY + offsetY,
      }))
    }

    return positioned
  }

  // Normalize margin configs
  const normalizeMargin = (
    margin: ContactsArray | MarginConfig | undefined,
  ): MarginConfig | undefined => {
    if (!margin) return undefined
    if (Array.isArray(margin)) {
      return { contacts: margin }
    }
    return margin
  }

  // Build the margin assignments with their configs
  let marginConfigs: {
    leftMargin?: MarginConfig
    topMargin?: MarginConfig
    rightMargin?: MarginConfig
    bottomMargin?: MarginConfig
    centerMargin?: MarginConfig
    topWingMargin?: MarginConfig
    bottomWingMargin?: MarginConfig
    leftWingMargin?: MarginConfig
    rightWingMargin?: MarginConfig
    topLeftCorner_Up?: MarginConfig
    topRightCorner_Up?: MarginConfig
    bottomLeftCorner_Down?: MarginConfig
    bottomRightCorner_Down?: MarginConfig
    topLeftCorner_Left?: MarginConfig
    bottomLeftCorner_Left?: MarginConfig
    topRightCorner_Right?: MarginConfig
    bottomRightCorner_Right?: MarginConfig
    topLeftCorner_Diagonal?: MarginConfig
    topRightCorner_Diagonal?: MarginConfig
    bottomLeftCorner_Diagonal?: MarginConfig
    bottomRightCorner_Diagonal?: MarginConfig
  } = {}

  // If individual margins specified, use those
  if (
    leftMargin ||
    topMargin ||
    rightMargin ||
    bottomMargin ||
    centerMargin ||
    topWingMargin ||
    bottomWingMargin ||
    leftWingMargin ||
    rightWingMargin ||
    topLeftCorner_Up ||
    topRightCorner_Up ||
    bottomLeftCorner_Down ||
    bottomRightCorner_Down ||
    topLeftCorner_Left ||
    bottomLeftCorner_Left ||
    topRightCorner_Right ||
    bottomRightCorner_Right ||
    topLeftCorner_Diagonal ||
    topRightCorner_Diagonal ||
    bottomLeftCorner_Diagonal ||
    bottomRightCorner_Diagonal
  ) {
    marginConfigs = {
      leftMargin: normalizeMargin(leftMargin),
      topMargin: normalizeMargin(topMargin),
      rightMargin: normalizeMargin(rightMargin),
      bottomMargin: normalizeMargin(bottomMargin),
      centerMargin: normalizeMargin(centerMargin),
      topWingMargin: normalizeMargin(topWingMargin),
      bottomWingMargin: normalizeMargin(bottomWingMargin),
      leftWingMargin: normalizeMargin(leftWingMargin),
      rightWingMargin: normalizeMargin(rightWingMargin),
      topLeftCorner_Up: normalizeMargin(topLeftCorner_Up),
      topRightCorner_Up: normalizeMargin(topRightCorner_Up),
      bottomLeftCorner_Down: normalizeMargin(bottomLeftCorner_Down),
      bottomRightCorner_Down: normalizeMargin(bottomRightCorner_Down),
      topLeftCorner_Left: normalizeMargin(topLeftCorner_Left),
      bottomLeftCorner_Left: normalizeMargin(bottomLeftCorner_Left),
      topRightCorner_Right: normalizeMargin(topRightCorner_Right),
      bottomRightCorner_Right: normalizeMargin(bottomRightCorner_Right),
      topLeftCorner_Diagonal: normalizeMargin(topLeftCorner_Diagonal),
      topRightCorner_Diagonal: normalizeMargin(topRightCorner_Diagonal),
      bottomLeftCorner_Diagonal: normalizeMargin(bottomLeftCorner_Diagonal),
      bottomRightCorner_Diagonal: normalizeMargin(bottomRightCorner_Diagonal),
    }
  }
  // Otherwise, auto-distribute the contacts array
  else if (contacts && contacts.length > 0) {
    // Calculate capacity for each margin
    const gridSpacing = size === "Medium" ? 2 : 6

    // Distribute contacts across margins in clockwise order
    const marginOrder: Array<
      | "leftMargin"
      | "leftWingMargin"
      | "topMargin"
      | "topWingMargin"
      | "rightMargin"
      | "rightWingMargin"
      | "bottomMargin"
      | "bottomWingMargin"
      | "centerMargin"
    > = [
      "leftMargin",
      "leftWingMargin",
      "topMargin",
      "topWingMargin",
      "rightMargin",
      "rightWingMargin",
      "bottomMargin",
      "bottomWingMargin",
      "centerMargin",
    ]

    let contactIndex = 0
    for (const marginName of marginOrder) {
      const margin = moleculeResult.margins.find((m) => m.name === marginName)
      if (!margin || contactIndex >= contacts.length) continue

      // Calculate capacity based on margin size and orientation
      const isVertical =
        marginName === "leftMargin" ||
        marginName === "rightMargin" ||
        marginName === "leftWingMargin" ||
        marginName === "rightWingMargin"
      const dimension = isVertical ? margin.height : margin.width
      const capacity = Math.floor(dimension / gridSpacing)

      // Fill this margin up to capacity
      const contactsForMargin: (string | GapSpecifier)[] = []
      const available = Math.min(capacity, contacts.length - contactIndex)

      for (let i = 0; i < available; i++) {
        contactsForMargin.push(contacts[contactIndex])
        contactIndex++
      }

      if (contactsForMargin.length > 0) {
        // Type assertion needed here since we're building the array dynamically
        marginConfigs[marginName] = {
          contacts: contactsForMargin as ContactsArray,
        }
      }

      if (contactIndex >= contacts.length) break
    }
  }

  // Now we have margin configs - generate designators and render
  // Collect all contacts with their positions in processing order
  const allContactsWithPositions: Array<{
    name: string
    designator: string
    margin: string
    index: number
    size: ContactSize
    perpendicularShift: ContactPerpendicularShift
    align: ContactAlign
    spacing?: number
    gap?: number
    padding?: number
    customGapAfter?: number // Custom gap after this specific contact
    moleculeAfter?: MoleculeGapSpecifier // Molecule spec after this contact (if any)
  }> = []

  const marginOrder: Array<
    | "leftMargin"
    | "leftWingMargin"
    | "topMargin"
    | "topWingMargin"
    | "rightMargin"
    | "rightWingMargin"
    | "bottomMargin"
    | "bottomWingMargin"
    | "centerMargin"
    | "topLeftCorner_Up"
    | "topRightCorner_Up"
    | "bottomLeftCorner_Down"
    | "bottomRightCorner_Down"
    | "topLeftCorner_Left"
    | "bottomLeftCorner_Left"
    | "topRightCorner_Right"
    | "bottomRightCorner_Right"
    | "topLeftCorner_Diagonal"
    | "topRightCorner_Diagonal"
    | "bottomLeftCorner_Diagonal"
    | "bottomRightCorner_Diagonal"
  > = [
    "leftMargin",
    "leftWingMargin",
    "topMargin",
    "topWingMargin",
    "rightMargin",
    "rightWingMargin",
    "bottomMargin",
    "bottomWingMargin",
    "centerMargin",
    "topLeftCorner_Up",
    "topRightCorner_Up",
    "bottomLeftCorner_Down",
    "bottomRightCorner_Down",
    "topLeftCorner_Left",
    "bottomLeftCorner_Left",
    "topRightCorner_Right",
    "bottomRightCorner_Right",
    "topLeftCorner_Diagonal",
    "topRightCorner_Diagonal",
    "bottomLeftCorner_Diagonal",
    "bottomRightCorner_Diagonal",
  ]

  let designatorCounter = 1

  for (const marginName of marginOrder) {
    const marginConfig = marginConfigs[marginName]
    if (!marginConfig) continue

    // Get the input array (supports both contacts and elements syntax)
    const inputArray = getInputArray(marginConfig)
    if (inputArray.length === 0) continue

    // Get margin-specific size, perpendicularShift, align, spacing, gap, and padding, falling back to defaults
    const marginSize = marginConfig.contactSize ?? size
    const contactBoundingBoxSize = marginSize === "Medium" ? 2 : 6

    const marginSpacing = marginConfig.spacing
    const marginGap = marginConfig.gap
    const marginPadding = marginConfig.padding

    // Get the margin data for fill expansion
    const margin = moleculeResult.margins.find((m) => m.name === marginName)
    if (!margin) {
      console.error(`Margin ${marginName} not found in molecule`)
      continue
    }

    // Expand "*SPACE*" markers first (before "*FILL*")
    const spaceExpandedArray = expandSpaceMarkers(
      inputArray,
      margin,
      marginName,
      contactBoundingBoxSize,
      marginSpacing,
      marginGap,
    )

    // Then expand "*FILL*" markers
    const {
      expanded: expandedInputArray,
      perpendicularShift: fillMarkerShift,
      contactSize: fillMarkerSize,
      align: fillMarkerAlign,
    } = expandFillMarkers(
      spaceExpandedArray,
      margin,
      marginName,
      contactBoundingBoxSize,
      marginSpacing,
      marginGap,
    )

    // Apply contact size: fill marker variant takes precedence over explicit config
    const effectiveMarginSize = fillMarkerSize ?? marginSize
    const effectiveContactBoundingBoxSize =
      effectiveMarginSize === "Medium" ? 2 : 6

    // Apply perpendicular shift: fill marker variant takes precedence over explicit config
    const marginAlignment =
      fillMarkerShift ?? marginConfig.perpendicularShift ?? perpendicularShift
    // Apply align: fill marker variant takes precedence over explicit config
    const marginAlign = fillMarkerAlign ?? marginConfig.align ?? align

    // Parse using the new unified parser that handles both syntaxes (with effective contact size)
    const parseResult = parseToElements(
      expandedInputArray,
      effectiveContactBoundingBoxSize,
    )
    const contactNames = parseResult.contactNames

    // For now, we don't support custom gaps/molecules in the designator generation path for elements
    // Those will be handled purely in the rendering path
    const customGaps = new Map<number, number>()
    const moleculesAfter = new Map<number, MoleculeGapSpecifier>()

    // Validation Rule 1: Can't put Large contacts on Medium pins
    if (pinSize === "Medium" && effectiveMarginSize === "Large") {
      console.error(
        `Invalid configuration: Cannot place Large contacts on a molecule with Medium pins. ` +
          `Margin: ${marginName}, Pin size: ${pinSize}, Contact size: ${effectiveMarginSize}`,
      )
      return null
    }

    // Validation Rule 2: String alignment only works with Medium contacts on Large pin molecules
    if (typeof marginAlignment === "string" && marginAlignment !== "center") {
      if (pinSize === "Medium") {
        console.error(
          `Invalid configuration: Cannot use perpendicularShift="${marginAlignment}" with Medium pins. ` +
            `Alignment (other than "center") only works with Medium contacts on Large pin molecules. ` +
            `Margin: ${marginName}`,
        )
        return null
      }
      if (pinSize === "Large" && effectiveMarginSize === "Large") {
        console.error(
          `Invalid configuration: Cannot use perpendicularShift="${marginAlignment}" with Large contacts. ` +
            `Alignment (other than "center") only works with Medium contacts on Large pin molecules. ` +
            `Margin: ${marginName}`,
        )
        return null
      }
    }

    // Validation Rule 2b: center-symmetrical only works with Large contacts (initially)
    if (marginAlign === "center-symmetrical" || marginAlign === "cs") {
      if (effectiveMarginSize !== "Large") {
        console.error(
          `Invalid configuration: align="center-symmetrical" currently only works with Large contacts. ` +
            `Margin: ${marginName}, Contact size: ${effectiveMarginSize}. ` +
            `Use align="center" for Medium contacts instead.`,
        )
        return null
      }
    }

    // Validation Rule 2b2: pin-symmetrical only works with Large contacts (initially)
    if (marginAlign === "pin-symmetrical" || marginAlign === "ps") {
      if (effectiveMarginSize !== "Large") {
        console.error(
          `Invalid configuration: align="pin-symmetrical" currently only works with Large contacts. ` +
            `Margin: ${marginName}, Contact size: ${effectiveMarginSize}.`,
        )
        return null
      }
    }

    // Validation Rule 2c: Numeric perpendicularShift must be multiple of 2mm
    if (typeof marginAlignment === "number") {
      if (marginAlignment % 2 !== 0) {
        console.error(
          `Invalid configuration: perpendicularShift (${marginAlignment}mm) must be a multiple of 2mm to stay on the 2mm grid. ` +
            `Margin: ${marginName}`,
        )
        return null
      }

      // Validation Rule 2c: Numeric perpendicularShift must not push contacts outside the board
      const isStandardMargin =
        marginName === "leftMargin" ||
        marginName === "rightMargin" ||
        marginName === "topMargin" ||
        marginName === "bottomMargin"
      const isWingEdgeMargin = marginName.includes("Corner")

      if (isStandardMargin || isWingEdgeMargin) {
        const boardNominalWidth = moleculeResult.boardNominalWidth
        const boardNominalHeight = moleculeResult.boardNominalHeight
        const boardWidth = moleculeResult.boardWidth
        const boardHeight = moleculeResult.boardHeight
        const wingParams = moleculeResult.wingParams // Get individual wing dimensions for asymmetric wings

        let maxShift = 0

        if (isStandardMargin) {
          // Standard margins: max shift = individual wing dimension for that side
          if (wingParams) {
            // Use individual wing dimensions for asymmetric wings
            if (marginName === "leftMargin") {
              maxShift = mm(wingParams.left)
            } else if (marginName === "rightMargin") {
              maxShift = mm(wingParams.right)
            } else if (marginName === "topMargin") {
              maxShift = mm(wingParams.top)
            } else if (marginName === "bottomMargin") {
              maxShift = mm(wingParams.bottom)
            }
          } else {
            // Fallback to symmetric calculation if wingParams not available
            if (marginName === "leftMargin" || marginName === "rightMargin") {
              maxShift = (boardWidth - boardNominalWidth) / 2
            } else if (
              marginName === "topMargin" ||
              marginName === "bottomMargin"
            ) {
              maxShift = (boardHeight - boardNominalHeight) / 2
            }
          }
        } else {
          // Wing edge margins: max shift = individual wing dimension for that edge
          if (wingParams) {
            // Parse wing edge margin name to determine which wing it's on
            if (marginName.includes("Left")) {
              // Left wing edges
              if (marginName.includes("_Left")) {
                // Going left (perpendicular extends into left wing)
                maxShift = mm(wingParams.left)
              } else {
                // Going up/down (perpendicular extends into top/bottom wing)
                if (marginName.includes("topLeft")) {
                  maxShift = mm(wingParams.top)
                } else {
                  maxShift = mm(wingParams.bottom)
                }
              }
            } else if (marginName.includes("Right")) {
              // Right wing edges
              if (marginName.includes("_Right")) {
                // Going right (perpendicular extends into right wing)
                maxShift = mm(wingParams.right)
              } else {
                // Going up/down (perpendicular extends into top/bottom wing)
                if (marginName.includes("topRight")) {
                  maxShift = mm(wingParams.top)
                } else {
                  maxShift = mm(wingParams.bottom)
                }
              }
            }
          } else {
            // Fallback to symmetric calculation
            if (marginName.includes("Left") || marginName.includes("Right")) {
              maxShift = (boardWidth - boardNominalWidth) / 2
            } else {
              maxShift = (boardHeight - boardNominalHeight) / 2
            }
          }
        }

        // Debug logging (commented out - uncomment to debug validation)
        // console.log(`DEBUG perpendicularShift validation for ${marginName}:`, {
        //   marginAlignment,
        //   maxShift,
        //   boardWidth,
        //   boardNominalWidth,
        //   boardHeight,
        //   boardNominalHeight,
        //   wingParams,
        //   isStandardMargin,
        //   isWingEdgeMargin
        // });

        // Check if absolute value of shift exceeds wing dimension
        if (Math.abs(marginAlignment) > maxShift) {
          console.error(
            `Invalid configuration: perpendicularShift (${marginAlignment}mm) would push contacts outside the board outline. ` +
              `Maximum shift for ${marginName} is ±${maxShift}mm (wing dimension for that side). ` +
              `Margin: ${marginName}`,
          )
          return null
        }
      }
    }

    // Validation Rule 3: Spacing validation

    if (marginSpacing !== undefined) {
      // Spacing must be at least the contact bounding box size to prevent overlaps
      if (marginSpacing < contactBoundingBoxSize) {
        console.error(
          `Invalid configuration: spacing (${marginSpacing}mm) is less than contact size (${contactBoundingBoxSize}mm). ` +
            `This would cause contacts to overlap. Minimum spacing for ${marginSize} contacts is ${contactBoundingBoxSize}mm. ` +
            `Margin: ${marginName}`,
        )
        return null
      }

      // Spacing must be a multiple of 2mm to stay on grid
      if (marginSpacing % 2 !== 0) {
        console.error(
          `Invalid configuration: spacing (${marginSpacing}mm) must be a multiple of 2mm to stay on the 2mm grid. ` +
            `Margin: ${marginName}`,
        )
        return null
      }
    }

    if (marginGap !== undefined) {
      // Gap must be at least -1mm for Medium (resulting in min 1mm spacing) or -3mm for Large (resulting in min 3mm spacing)
      // But we need final spacing to be >= contactBoundingBoxSize and a multiple of 2mm
      const finalSpacing = contactBoundingBoxSize + marginGap

      if (finalSpacing < contactBoundingBoxSize) {
        console.error(
          `Invalid configuration: gap (${marginGap}mm) results in spacing of ${finalSpacing}mm, which is less than contact size (${contactBoundingBoxSize}mm). ` +
            `This would cause contacts to overlap. Minimum gap for ${marginSize} contacts is ${-contactBoundingBoxSize + contactBoundingBoxSize}mm (0mm). ` +
            `Margin: ${marginName}`,
        )
        return null
      }

      // Final spacing must be a multiple of 2mm to stay on grid
      if (finalSpacing % 2 !== 0) {
        console.error(
          `Invalid configuration: gap (${marginGap}mm) results in spacing of ${finalSpacing}mm, which must be a multiple of 2mm to stay on the 2mm grid. ` +
            `Margin: ${marginName}`,
        )
        return null
      }
    }

    // Validation Rule 4: Padding must not push contacts off board or overlap corner pins
    if (marginPadding !== undefined && marginPadding !== 0) {
      const normalizedAlign =
        marginAlign === "ccw" || marginAlign === "counterclockwise"
          ? "left"
          : marginAlign === "cw" || marginAlign === "clockwise"
            ? "right"
            : marginAlign === "c"
              ? "center"
              : marginAlign

      // Get the margin being used
      const margin = moleculeResult.margins.find((m) => m.name === marginName)
      if (!margin) {
        console.error(`Margin ${marginName} not found in molecule`)
        return null
      }

      // Calculate how much space the contacts will use
      const effectiveSpacing =
        marginSpacing ??
        (marginGap !== undefined
          ? contactBoundingBoxSize + marginGap
          : contactBoundingBoxSize)
      const usedSpace =
        contactNames.length > 0
          ? (contactNames.length - 1) * effectiveSpacing +
            contactBoundingBoxSize
          : 0
      const isVertical =
        marginName === "leftMargin" || marginName === "rightMargin"
      const availableSpace = isVertical ? margin.height : margin.width
      const leftoverSpace = availableSpace - usedSpace

      // Calculate the alignment offset
      let alignmentOffset = 0
      if (normalizedAlign === "center") {
        alignmentOffset = Math.round(leftoverSpace / 2 / 2) * 2
      } else if (normalizedAlign === "left") {
        alignmentOffset = 0
      } else if (normalizedAlign === "right") {
        alignmentOffset = leftoverSpace
      }

      // Check if padding would push contacts outside the margin bounds
      const finalOffset = alignmentOffset + marginPadding

      if (finalOffset < 0) {
        console.error(
          `Invalid configuration: padding (${marginPadding}mm) with align="${normalizedAlign}" would push contacts outside the ${marginName}. ` +
            `The combination results in offset ${finalOffset}mm (negative offset = off board). ` +
            `Maximum negative padding for this configuration: ${-alignmentOffset}mm`,
        )
        return null
      }

      if (finalOffset > leftoverSpace) {
        console.error(
          `Invalid configuration: padding (${marginPadding}mm) with align="${normalizedAlign}" would push contacts outside the ${marginName}. ` +
            `The combination results in offset ${finalOffset}mm (max allowed: ${leftoverSpace}mm). ` +
            `Maximum positive padding for this configuration: ${leftoverSpace - alignmentOffset}mm`,
        )
        return null
      }
    }

    contactNames.forEach((contactName: string, index: number) => {
      allContactsWithPositions.push({
        name: contactName,
        designator: `MC${designatorCounter}`,
        margin: marginName,
        index,
        size: effectiveMarginSize,
        perpendicularShift: marginAlignment,
        align: marginAlign,
        spacing: marginSpacing,
        gap: marginGap,
        padding: marginPadding,
        customGapAfter: customGaps.get(index), // Custom gap after this specific contact
        moleculeAfter: moleculesAfter.get(index), // Molecule spec after this contact (if any)
      })
      designatorCounter++
    })
  }

  // DEDUPLICATION PHASE: Calculate positions for all contacts to detect duplicates
  // This prevents wing margin corner overlaps from creating duplicate contacts
  const contactsWithCalculatedPositions: Array<{
    contact: (typeof allContactsWithPositions)[number]
    pcbX: number
    pcbY: number
  }> = []

  // First pass: Calculate positions for all contacts across all margins
  for (const contact of allContactsWithPositions) {
    const marginName = contact.margin
    const marginConfig = marginConfigs[marginName as keyof typeof marginConfigs]
    if (!marginConfig) continue

    const margin = moleculeResult.margins.find((m) => m.name === marginName)
    if (!margin) continue

    const contactBoundingBoxSize = contact.size === "Medium" ? 2 : 6

    // Get same margin contacts for index-based access
    const sameMarginContacts = allContactsWithPositions.filter(
      (c) => c.margin === marginName,
    )
    const contactIndexInMargin = sameMarginContacts.indexOf(contact)

    // Replicate the same logic used in rendering to calculate position
    const inputArrayForPositioning = getInputArray(marginConfig)
    const spaceExpandedArrayForPositioning = expandSpaceMarkers(
      inputArrayForPositioning,
      margin,
      marginName,
      contactBoundingBoxSize,
      contact.spacing,
      contact.gap,
    )
    const {
      expanded: expandedInputArrayForPositioning,
      contactSize: fillMarkerSizeForPositioning,
    } = expandFillMarkers(
      spaceExpandedArrayForPositioning,
      margin,
      marginName,
      contactBoundingBoxSize,
      contact.spacing,
      contact.gap,
    )

    const { leadingGap, elements, trailingGap } = parseToElements(
      expandedInputArrayForPositioning,
      contactBoundingBoxSize,
    )

    const positionedElements = calculateElementPositions(
      elements,
      leadingGap,
      trailingGap,
      margin,
      marginName,
      contact.align,
      contact.padding,
      contact.perpendicularShift,
      contactBoundingBoxSize,
      moleculeResult.machinePins,
    )

    // Find this contact's position in the positioned elements
    let elementIndex = 0
    let found = false
    for (const { element, pcbX, pcbY } of positionedElements) {
      if (element.type === "contact") {
        if (elementIndex === contactIndexInMargin) {
          contactsWithCalculatedPositions.push({
            contact,
            pcbX,
            pcbY,
          })
          found = true
          break
        }
        elementIndex++
      }
    }

    // If position wasn't found, skip this contact (shouldn't happen in normal operation)
    if (!found) {
      console.warn(
        `Contact deduplication: Could not calculate position for ${contact.designator} ` +
          `(${contact.name}) in ${marginName}. Skipping this contact.`,
      )
    }
  }

  // Deduplicate contacts at the same position (first processed wins)
  // Build position-to-original-contact map directly during deduplication
  const positionToOriginalContact = new Map<
    string,
    (typeof contactsWithCalculatedPositions)[0]
  >()
  const deduplicatedContacts: typeof allContactsWithPositions = []
  const removedDuplicates: Array<{
    removed: string
    kept: string
    position: string
  }> = []
  const processedContactSet = new Set<
    (typeof allContactsWithPositions)[number]
  >()

  for (const item of contactsWithCalculatedPositions) {
    // Safety check: skip if item or contact is undefined
    if (!item || !item.contact) {
      console.warn(
        "Contact deduplication: Encountered undefined item, skipping",
      )
      continue
    }

    // Round to 2 decimal places for position key
    const posKey = `${item.pcbX.toFixed(2)},${item.pcbY.toFixed(2)}`

    if (!positionToOriginalContact.has(posKey)) {
      // First contact at this position - keep it
      positionToOriginalContact.set(posKey, item)
      deduplicatedContacts.push(item.contact)
      processedContactSet.add(item.contact)
    } else {
      // Duplicate contact at this position - remove it
      const existing = positionToOriginalContact.get(posKey)
      if (existing && existing.contact) {
        removedDuplicates.push({
          removed: `${item.contact.designator} (${item.contact.name}) in ${item.contact.margin}`,
          kept: `${existing.contact.designator} (${existing.contact.name}) in ${existing.contact.margin}`,
          position: posKey,
        })
        processedContactSet.add(item.contact)
      }
    }
  }

  // Add any contacts that weren't processed (shouldn't happen, but safety check)
  for (const contact of allContactsWithPositions) {
    if (!processedContactSet.has(contact)) {
      console.warn(
        `Contact deduplication: Contact ${contact.designator} (${contact.name}) ` +
          `in ${contact.margin} was not processed. Including it without deduplication check.`,
      )
      deduplicatedContacts.push(contact)
    }
  }

  // Log warnings for removed duplicates (exact position overlap)
  if (removedDuplicates.length > 0) {
    console.warn(
      `Contact deduplication: Removed ${removedDuplicates.length} duplicate contact(s) at exact overlapping positions. ` +
        `First processed contact wins in clockwise order.`,
    )
    removedDuplicates.forEach(({ removed, kept, position }) => {
      console.warn(
        `  Position (${position}mm): Kept ${kept}, removed ${removed}`,
      )
    })
  }

  // PHASE 2: Deduplicate contacts that are too close (partial overlap)
  // This handles contacts that are NEAR each other but not at exact same position
  const partialOverlapRemovals: Array<{
    removed: string
    kept: string
    position: string
  }> = []
  const contactsAfterPartialOverlapRemoval: typeof allContactsWithPositions = []
  const wingMarginNames = [
    "leftWingMargin",
    "rightWingMargin",
    "topWingMargin",
    "bottomWingMargin",
  ]

  // Check all pairs for "too close" overlaps (only between different wing margins)
  for (let i = 0; i < deduplicatedContacts.length; i++) {
    let shouldKeep = true
    const contact1 = deduplicatedContacts[i]
    const pos1 = contactsWithCalculatedPositions.find(
      (c) => c && c.contact === contact1,
    )

    // Skip if position not found
    if (!pos1) continue

    // Only check wing margin contacts
    if (!wingMarginNames.includes(contact1.margin)) {
      contactsAfterPartialOverlapRemoval.push(contact1)
      continue
    }

    for (let j = 0; j < i; j++) {
      // Only check against earlier contacts (clockwise priority)
      const contact2 = deduplicatedContacts[j]
      const pos2 = contactsWithCalculatedPositions.find(
        (c) => c && c.contact === contact2,
      )

      // Skip if position not found
      if (!pos2) continue

      // Only check between different wing margins
      if (!wingMarginNames.includes(contact2.margin)) continue
      if (contact1.margin === contact2.margin) continue

      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(pos1.pcbX - pos2.pcbX, 2) + Math.pow(pos1.pcbY - pos2.pcbY, 2),
      )

      // Skip exact overlaps (already handled in phase 1)
      if (distance < 0.01) continue

      // Check if too close (partial overlap)
      const contact1BoundingBoxSize = contact1.size === "Medium" ? 2 : 6
      const contact2BoundingBoxSize = contact2.size === "Medium" ? 2 : 6
      const minDistance =
        (contact1BoundingBoxSize + contact2BoundingBoxSize) / 2
      if (distance < minDistance) {
        shouldKeep = false
        partialOverlapRemovals.push({
          removed: `${contact1.designator} (${contact1.name}) in ${contact1.margin}`,
          kept: `${contact2.designator} (${contact2.name}) in ${contact2.margin}`,
          position: `distance=${distance.toFixed(2)}mm (min=${minDistance.toFixed(2)}mm)`,
        })
        break // Remove this contact, keep earlier one
      }
    }

    if (shouldKeep) {
      contactsAfterPartialOverlapRemoval.push(contact1)
    }
  }

  // Log warnings for partial overlaps
  if (partialOverlapRemovals.length > 0) {
    console.warn(
      `Contact deduplication: Removed ${partialOverlapRemovals.length} contact(s) too close to other contacts (partial overlap). ` +
        `First processed contact wins in clockwise order.`,
    )
    partialOverlapRemovals.forEach(({ removed, kept, position }) => {
      console.warn(`  ${position}: Kept ${kept}, removed ${removed}`)
    })
  }

  // Renumber contacts sequentially without gaps (after both deduplication phases)
  let newDesignatorCounter = 1
  const originalToRenumbered = new Map<
    (typeof allContactsWithPositions)[number],
    (typeof allContactsWithPositions)[number]
  >()
  const renumberedContacts = contactsAfterPartialOverlapRemoval.map(
    (contact) => {
      const renumbered = {
        ...contact,
        designator: `MC${newDesignatorCounter++}`,
      }
      originalToRenumbered.set(contact, renumbered)
      return renumbered
    },
  )

  // Create a position-to-contact map for rendering
  // Map each position directly to its corresponding renumbered contact
  const positionToContactMap = new Map<
    string,
    (typeof renumberedContacts)[number]
  >()
  for (const [posKey, item] of positionToOriginalContact.entries()) {
    const renumberedContact = originalToRenumbered.get(item.contact)
    if (renumberedContact) {
      positionToContactMap.set(posKey, renumberedContact)
    }
  }

  // Group contacts by margin for position calculation
  const contactsByMargin: Record<string, typeof renumberedContacts> = {}
  renumberedContacts.forEach((contact) => {
    if (!contactsByMargin[contact.margin]) {
      contactsByMargin[contact.margin] = []
    }
    contactsByMargin[contact.margin].push(contact)
  })

  // Collect molecule gap specifiers for visualization (temporary - will be replaced with actual molecules)
  const moleculeGapVisualizations: Array<{
    pcbX: number
    pcbY: number
    width: number
    height: number
  }> = []

  // Use ref to collect molecule info across render without triggering re-renders
  const moleculesInfoRef = useRef<MoleculeInfo[]>([])

  // Reset the ref on each render
  moleculesInfoRef.current = []

  // Use useEffect to log and callback with molecules after rendering completes
  useEffect(() => {
    if (moleculesInfoRef.current.length > 0) {
      og("PackContacts: Detected molecules", moleculesInfoRef.current)
      if (onMoleculesDetected) {
        onMoleculesDetected(moleculesInfoRef.current)
      }
    }
  })

  // Global collection for overlap detection across margins
  const allPositionedContacts: Array<{
    designator: string
    name: string
    margin: string
    pcbX: number
    pcbY: number
    boundingBoxSize: number
  }> = []

  // Track which contacts have already been rendered to prevent duplicates
  // This set persists across all margin iterations to ensure each contact is rendered exactly once
  const renderedContacts = new Set<string>()

  // Render all contacts using simplified element-based approach
  return (
    <>
      {Object.entries(contactsByMargin).map(([marginName, marginContacts]) => {
        if (marginContacts.length === 0) return null

        // All contacts in a margin have the same size, perpendicularShift, align, spacing, and gap
        const firstContact = marginContacts[0]
        const margin = moleculeResult.margins.find((m) => m.name === marginName)

        if (!margin) {
          console.warn(`Margin ${marginName} not found in molecule`)
          return null
        }

        const contactBoundingBoxSize = firstContact.size === "Medium" ? 2 : 6

        // NEW SIMPLIFIED APPROACH: Parse using unified parser
        const marginConfig =
          marginConfigs[marginName as keyof typeof marginConfigs]
        if (!marginConfig) return null

        // Get the input array (supports both contacts and elements syntax)
        const inputArrayForRendering = getInputArray(marginConfig)

        // Expand "*SPACE*" markers first (for rendering)
        const spaceExpandedArrayForRendering = expandSpaceMarkers(
          inputArrayForRendering,
          margin,
          marginName,
          contactBoundingBoxSize,
          firstContact.spacing,
          firstContact.gap,
        )

        // Then expand "*FILL*" markers (for rendering)
        const {
          expanded: expandedInputArrayForRendering,
          contactSize: fillMarkerSizeForRendering,
        } = expandFillMarkers(
          spaceExpandedArrayForRendering,
          margin,
          marginName,
          contactBoundingBoxSize,
          firstContact.spacing,
          firstContact.gap,
        )

        const { leadingGap, elements, trailingGap } = parseToElements(
          expandedInputArrayForRendering,
          contactBoundingBoxSize,
        )

        // Calculate positions for all elements (contacts, gaps, molecules)
        const positionedElements = calculateElementPositions(
          elements,
          leadingGap,
          trailingGap,
          margin,
          marginName,
          firstContact.align,
          firstContact.padding,
          firstContact.perpendicularShift,
          contactBoundingBoxSize,
          moleculeResult.machinePins,
        )

        // Render each positioned element
        const elementsToRender: React.ReactElement[] = []

        for (const { element, pcbX, pcbY } of positionedElements) {
          if (element.type === "contact") {
            // Look up which contact (if any) should be rendered at this position
            const posKey = `${pcbX.toFixed(2)},${pcbY.toFixed(2)}`
            const contact = positionToContactMap.get(posKey)

            // Skip if this position had a duplicate contact that was removed
            if (!contact) {
              continue
            }

            // Skip if this contact has already been rendered in a previous margin
            // This prevents the same contact from being rendered multiple times when
            // multiple margins include the same position (e.g., overlapping corners)
            if (renderedContacts.has(contact.designator)) {
              continue
            }
            renderedContacts.add(contact.designator)

            // Validation Rule 5: Check for contact-pin overlap
            const pinBoundingBoxSize = pinSize === "Medium" ? 2 : 6

            if (moleculeResult.machinePins) {
              for (const pin of moleculeResult.machinePins) {
                const distance = Math.sqrt(
                  Math.pow(pcbX - pin.x, 2) + Math.pow(pcbY - pin.y, 2),
                )

                const minDistance =
                  (contactBoundingBoxSize + pinBoundingBoxSize) / 2
                if (distance < minDistance) {
                  console.error(
                    `Invalid configuration: Contact ${contact.designator} (${contact.name}) overlaps with pin ${pin.name}. ` +
                      `Contact position: (${pcbX.toFixed(2)}, ${pcbY.toFixed(2)}), ` +
                      `Pin position: (${pin.x.toFixed(2)}, ${pin.y.toFixed(2)}), ` +
                      `Distance: ${distance.toFixed(2)}mm, Minimum required: ${minDistance.toFixed(2)}mm. ` +
                      `Contact bounding box: ${contactBoundingBoxSize}mm, Pin bounding box: ${pinBoundingBoxSize}mm. ` +
                      `Margin: ${marginName}, Align: ${contact.align}`,
                  )
                }
              }
            }

            // Collect positioned contact for cross-margin overlap detection
            allPositionedContacts.push({
              designator: contact.designator,
              name: contact.name,
              margin: marginName,
              pcbX: pcbX,
              pcbY: pcbY,
              boundingBoxSize: contactBoundingBoxSize,
            })

            // Determine component to use based on element size (not contact size from margin config)
            // element.size is the actual size in mm (2 for Medium, 6 for Large)
            let Component: React.ComponentType<{
              name: string
              pcbX: number
              pcbY: number
            }>

            if (ContactComponent) {
              Component = ContactComponent
            } else if (element.size === 2) {
              // Medium = 2mm
              Component = (props: {
                name: string
                pcbX: number
                pcbY: number
              }) => (
                <MachineContactMedium
                  name={props.name}
                  pcbX={props.pcbX}
                  pcbY={props.pcbY}
                />
              )
            } else {
              // Large = 6mm
              Component = (props: {
                name: string
                pcbX: number
                pcbY: number
              }) => (
                <MachineContactLarge
                  name={props.name}
                  pcbX={props.pcbX}
                  pcbY={props.pcbY}
                />
              )
            }

            elementsToRender.push(
              <Component
                key={contact.designator}
                name={contact.designator}
                pcbX={pcbX}
                pcbY={pcbY}
              />,
            )
          } else if (element.type === "moleculeComponent") {
            // Render molecule component as red rectangle placeholder (same as moleculeBySize)
            const Component = element.component
            const isVertical =
              marginName === "leftMargin" || marginName === "rightMargin"

            // For vertical margins, molecule dimensions are rotated (width becomes height on display)
            const displayWidth = isVertical ? element.height : element.width
            const displayHeight = isVertical ? element.width : element.height

            moleculeGapVisualizations.push({
              pcbX,
              pcbY,
              width: displayWidth,
              height: displayHeight,
            })

            // Add to moleculesInfo for tracking
            moleculesInfoRef.current.push({
              name: Component.name || "Unknown",
              pcbX,
              pcbY,
              width: displayWidth,
              height: displayHeight,
              rotation: element.rotation,
              margin: marginName,
            })
          } else if (element.type === "molecule") {
            // Render molecule visualization (red rectangle placeholder)
            const isVertical =
              marginName === "leftMargin" || marginName === "rightMargin"

            // For vertical margins, molecule dimensions are rotated (width becomes height on display)
            const displayWidth = isVertical ? element.height : element.width
            const displayHeight = isVertical ? element.width : element.height

            moleculeGapVisualizations.push({
              pcbX,
              pcbY,
              width: displayWidth,
              height: displayHeight,
            })

            // Add to moleculesInfo
            moleculesInfoRef.current.push({
              name: element.spec.moleculeBySize,
              pcbX,
              pcbY,
              width: displayWidth,
              height: displayHeight,
              rotation: element.spec.rotation ?? 0,
              margin: marginName,
            })
          }
          // gaps don't render anything
        }

        return elementsToRender
      })}

      {/* Validation Rule 6: Check for contact-contact overlap between different margins */}
      {allPositionedContacts.length > 0 &&
        (() => {
          // Check all pairs of contacts from different margins
          for (let i = 0; i < allPositionedContacts.length; i++) {
            for (let j = i + 1; j < allPositionedContacts.length; j++) {
              const contact1 = allPositionedContacts[i]
              const contact2 = allPositionedContacts[j]

              // Skip if same margin (already validated by Rule 3)
              if (contact1.margin === contact2.margin) continue

              // Calculate distance between contacts
              const distance = Math.sqrt(
                Math.pow(contact1.pcbX - contact2.pcbX, 2) +
                  Math.pow(contact1.pcbY - contact2.pcbY, 2),
              )

              // Skip if contacts are at the same position (already handled by deduplication)
              // Use same tolerance as deduplication (2 decimal places = 0.01mm)
              if (distance < 0.01) continue

              // Minimum required distance (sum of radii)
              const minDistance =
                (contact1.boundingBoxSize + contact2.boundingBoxSize) / 2

              if (distance < minDistance) {
                // Determine if this is a wing area vs wing edge overlap
                const wingAreaMargins = [
                  "leftWingMargin",
                  "rightWingMargin",
                  "topWingMargin",
                  "bottomWingMargin",
                ]
                const isWingAreaOverlap =
                  (wingAreaMargins.includes(contact1.margin) &&
                    contact2.margin.includes("Corner")) ||
                  (wingAreaMargins.includes(contact2.margin) &&
                    contact1.margin.includes("Corner"))

                const overlapType = isWingAreaOverlap
                  ? "Wing area margin vs Wing edge margin"
                  : "Cross-margin"

                console.error(
                  `Invalid configuration: ${overlapType} overlap detected! ` +
                    `Contact ${contact1.designator} (${contact1.name}) in ${contact1.margin} ` +
                    `overlaps with contact ${contact2.designator} (${contact2.name}) in ${contact2.margin}. ` +
                    `Contact 1 position: (${contact1.pcbX.toFixed(2)}, ${contact1.pcbY.toFixed(2)}), ` +
                    `Contact 2 position: (${contact2.pcbX.toFixed(2)}, ${contact2.pcbY.toFixed(2)}), ` +
                    `Distance: ${distance.toFixed(2)}mm, Minimum required: ${minDistance.toFixed(2)}mm. ` +
                    `Contact 1 bounding box: ${contact1.boundingBoxSize}mm, Contact 2 bounding box: ${contact2.boundingBoxSize}mm.` +
                    (isWingAreaOverlap
                      ? ` Consider using fewer contacts in wing margins or adjusting wing size.`
                      : ``),
                )
              }
            }
          }
          return null
        })()}

      {/* Validation Rule 7: Check for 2mm grid alignment */}
      {allPositionedContacts.length > 0 &&
        (() => {
          const GRID_SIZE = 2 // 2mm grid
          const TOLERANCE = 0.01 // 0.01mm tolerance for floating point errors

          for (const contact of allPositionedContacts) {
            // Check if pcbX is on grid
            const nearestGridX =
              Math.round(contact.pcbX / GRID_SIZE) * GRID_SIZE
            const offsetX = contact.pcbX - nearestGridX

            // Check if pcbY is on grid
            const nearestGridY =
              Math.round(contact.pcbY / GRID_SIZE) * GRID_SIZE
            const offsetY = contact.pcbY - nearestGridY

            // If either coordinate is off-grid, log error
            if (
              Math.abs(offsetX) > TOLERANCE ||
              Math.abs(offsetY) > TOLERANCE
            ) {
              console.error(
                `Invalid configuration: Contact ${contact.designator} (${contact.name}) in ${contact.margin} is not aligned to 2mm grid. ` +
                  `Position: (${contact.pcbX.toFixed(2)}, ${contact.pcbY.toFixed(2)}), ` +
                  `Nearest grid: (${nearestGridX.toFixed(2)}, ${nearestGridY.toFixed(2)}), ` +
                  `Offset: (${offsetX.toFixed(3)}mm, ${offsetY.toFixed(3)}mm). ` +
                  `All contacts must be positioned at 2mm intervals for proper alignment with machine pins. ` +
                  `Contact bounding box: ${contact.boundingBoxSize}mm.`,
              )
            }
          }
          return null
        })()}

      {/* Debug mode: Show molecule placeholder rectangles */}
      {/* TODO: Temporary visualization of molecule gap specifiers as red rectangles.
          These should be replaced with actual molecule instances that can be interacted with.
          For now, they just show where molecules would be placed based on the molecule: "NxM" syntax. */}
      {debug &&
        moleculeGapVisualizations.map((rect, index) => (
          <React.Fragment key={`molecule-gap-${index}`}>
            <pcbnoterect
              pcbX={rect.pcbX}
              pcbY={rect.pcbY}
              width={mm(rect.width)}
              height={mm(rect.height)}
              strokeWidth={0.1}
              color="#ff0000ff"
            />
          </React.Fragment>
        ))}
    </>
  )
}
