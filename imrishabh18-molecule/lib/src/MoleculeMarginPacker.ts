import {
  MachineContactMedium,
  MachineContactLarge,
} from "@tsci/imrishabh18.library"

import { MarginBox } from "./MoleculeCalculator"

export type ContactPerpendicularShift = "outer" | "center" | "inner" | number
export type ContactAlign =
  | "left"
  | "center"
  | "right"
  | "ccw"
  | "counterclockwise"
  | "cw"
  | "clockwise"
  | "c"
  | "space-between"
  | "sb"
  | "center-symmetrical"
  | "cs"
  | "pin-symmetrical"
  | "ps"
export type ContactSize = "Medium" | "Large"

export interface ContactPosition {
  name: string // "MC1", "MC2", etc. or user-defined name like "VCC"
  pcbX: number
  pcbY: number
  marginName: string // "leftMargin", "topMargin", etc.
  gridIndex: number // Position index within that margin (0-based)
}

export interface ContactRequest {
  name: string // User-defined name like "VCC", "GND", "TX"
  marginName: string // "leftMargin", "topMargin", "rightMargin", "bottomMargin", "centerMargin"
  size: ContactSize // "Medium" or "Large" (required)
  perpendicularShift?: ContactPerpendicularShift // Optional per-contact perpendicularShift (defaults to "center")
}

export interface MarginAlignment {
  [marginName: string]: ContactPerpendicularShift // Per-margin perpendicularShift override
}

export interface MarginPositions {
  marginName: string
  contactSize: ContactSize
  perpendicularShift: ContactPerpendicularShift
  capacity: number
  positions: Array<{ pcbX: number; pcbY: number; index: number }>
}

export interface MoleculeContactGrid {
  margins: {
    leftMargin?: MarginPositions
    topMargin?: MarginPositions
    rightMargin?: MarginPositions
    bottomMargin?: MarginPositions
    centerMargin?: MarginPositions
  }
}

/**
 * Calculate contact positions for specific margins only.
 * Contacts are placed on a 2mm grid within the specified margins.
 *
 * @param margins - Array of margin boxes from molecule calculation
 * @param contactBoundingBoxSize - Size of contact bounding box (2mm for Medium, 6mm for Large)
 * @param marginsToFill - Array of margin names to fill (e.g., ["leftMargin", "rightMargin"])
 * @param perpendicularShift - How to align contacts within margins: "outer" (near edge), "center" (default), "inner" (near board center)
 * @returns Array of contact positions with sequential naming (MC1, MC2, ...)
 */
export function calculateContactPositionsForMargins(
  margins: MarginBox[],
  contactBoundingBoxSize: number,
  marginsToFill: string[],
  perpendicularShift: ContactPerpendicularShift = "center",
): ContactPosition[] {
  const contactPositions: ContactPosition[] = []
  let contactNumber = 1

  // Determine which margins to process based on molecule type
  const centerMargin = margins.find((m) => m.name === "centerMargin")
  const is2Pin = centerMargin && margins.length === 1

  if (is2Pin) {
    // 2-pin molecule: only pack into centerMargin if specified
    if (centerMargin && marginsToFill.includes("centerMargin")) {
      const positions = calculateMarginGridPositions(
        centerMargin,
        contactBoundingBoxSize,
        "horizontal",
        "forward",
        perpendicularShift,
      )
      positions.forEach((pos, index) => {
        contactPositions.push({
          name: `MC${contactNumber++}`,
          pcbX: pos.pcbX,
          pcbY: pos.pcbY,
          marginName: "centerMargin",
          gridIndex: index,
        })
      })
    }
  } else {
    // 4-pin molecule: pack into edge margins (left, top, right, bottom) in clockwise order
    // Only process margins that are in the marginsToFill array
    const marginOrder = [
      "leftMargin",
      "topMargin",
      "rightMargin",
      "bottomMargin",
    ]

    marginOrder.forEach((marginName) => {
      // Skip if this margin is not in the list to fill
      if (!marginsToFill.includes(marginName)) return

      const margin = margins.find((m) => m.name === marginName)
      if (!margin) return

      let orientation: "horizontal" | "vertical"
      let direction: "forward" | "reverse"

      switch (marginName) {
        case "leftMargin":
          orientation = "vertical"
          direction = "forward" // bottom to top (y increases)
          break
        case "topMargin":
          orientation = "horizontal"
          direction = "forward" // left to right (x increases)
          break
        case "rightMargin":
          orientation = "vertical"
          direction = "reverse" // top to bottom (y decreases)
          break
        case "bottomMargin":
          orientation = "horizontal"
          direction = "reverse" // right to left (x decreases)
          break
        default:
          return
      }

      const positions = calculateMarginGridPositions(
        margin,
        contactBoundingBoxSize,
        orientation,
        direction,
        perpendicularShift,
        marginName,
      )

      positions.forEach((pos, index) => {
        contactPositions.push({
          name: `MC${contactNumber++}`,
          pcbX: pos.pcbX,
          pcbY: pos.pcbY,
          marginName: marginName,
          gridIndex: index,
        })
      })
    })
  }

  return contactPositions
}

/**
 * Calculate all valid contact positions for a molecule's margins.
 * Contacts are placed on a 2mm grid within the margins.
 *
 * For 4-pin molecules: Traverses leftMargin, topMargin, rightMargin, bottomMargin (clockwise)
 * For 2-pin molecules: Only uses centerMargin
 *
 * @param margins - Array of margin boxes from molecule calculation
 * @param contactBoundingBoxSize - Size of contact bounding box (2mm for Medium, 6mm for Large)
 * @param perpendicularShift - How to align contacts within margins: "outer" (near edge), "center" (default), "inner" (near board center)
 * @returns Array of contact positions with sequential naming (MC1, MC2, ...)
 */
export function calculateContactPositions(
  margins: MarginBox[],
  contactBoundingBoxSize: number,
  perpendicularShift: ContactPerpendicularShift = "center",
): ContactPosition[] {
  const contactPositions: ContactPosition[] = []
  let contactNumber = 1

  // Determine which margins to process based on molecule type
  const centerMargin = margins.find((m) => m.name === "centerMargin")
  const is2Pin = centerMargin && margins.length === 1

  if (is2Pin) {
    // 2-pin molecule: only pack into centerMargin
    if (centerMargin) {
      const positions = calculateMarginGridPositions(
        centerMargin,
        contactBoundingBoxSize,
        "horizontal",
        "forward",
        perpendicularShift,
      )
      positions.forEach((pos, index) => {
        contactPositions.push({
          name: `MC${contactNumber++}`,
          pcbX: pos.pcbX,
          pcbY: pos.pcbY,
          marginName: "centerMargin",
          gridIndex: index,
        })
      })
    }
  } else {
    // 4-pin molecule: pack into edge margins (left, top, right, bottom) in clockwise order
    // Skip centerMargin for 4-pin molecules
    const marginOrder = [
      "leftMargin",
      "topMargin",
      "rightMargin",
      "bottomMargin",
    ]

    marginOrder.forEach((marginName) => {
      const margin = margins.find((m) => m.name === marginName)
      if (!margin) return

      let orientation: "horizontal" | "vertical"
      let direction: "forward" | "reverse"

      switch (marginName) {
        case "leftMargin":
          orientation = "vertical"
          direction = "forward" // bottom to top (y increases)
          break
        case "topMargin":
          orientation = "horizontal"
          direction = "forward" // left to right (x increases)
          break
        case "rightMargin":
          orientation = "vertical"
          direction = "reverse" // top to bottom (y decreases)
          break
        case "bottomMargin":
          orientation = "horizontal"
          direction = "reverse" // right to left (x decreases)
          break
        default:
          return
      }

      const positions = calculateMarginGridPositions(
        margin,
        contactBoundingBoxSize,
        orientation,
        direction,
        perpendicularShift,
        marginName,
      )

      positions.forEach((pos, index) => {
        contactPositions.push({
          name: `MC${contactNumber++}`,
          pcbX: pos.pcbX,
          pcbY: pos.pcbY,
          marginName: marginName,
          gridIndex: index,
        })
      })
    })
  }

  return contactPositions
}

/**
 * Place user-specified contacts in margins with flexible positioning.
 * Allows arbitrary number of contacts per margin with custom names.
 *
 * @param margins - Array of margin boxes from molecule calculation
 * @param contactRequests - Array of contact requests with user-defined names and margin assignments
 * @param defaultAlignment - Default perpendicularShift for contacts (default: "center")
 * @param marginAlignments - Per-margin perpendicularShift overrides
 * @returns Array of contact positions with user names and calculated coordinates
 */
export function placeContactsInMargins(
  margins: MarginBox[],
  contactRequests: ContactRequest[],
  defaultAlignment: ContactPerpendicularShift = "center",
  marginAlignments?: MarginAlignment,
): ContactPosition[] {
  const contactPositions: ContactPosition[] = []

  // Return empty if no contacts requested
  if (contactRequests.length === 0) {
    return contactPositions
  }

  // Group contact requests by margin
  const contactsByMargin: Record<string, ContactRequest[]> = {}
  contactRequests.forEach((request) => {
    if (!contactsByMargin[request.marginName]) {
      contactsByMargin[request.marginName] = []
    }
    contactsByMargin[request.marginName].push(request)
  })

  // Determine molecule type
  const centerMargin = margins.find((m) => m.name === "centerMargin")
  const is2Pin = centerMargin && margins.length === 1

  // Define margin processing order (clockwise for 4-pin)
  const marginOrder = is2Pin
    ? ["centerMargin"]
    : ["leftMargin", "topMargin", "rightMargin", "bottomMargin"]

  let contactNumber = 1

  // Process each margin in clockwise order
  marginOrder.forEach((marginName) => {
    const margin = margins.find((m) => m.name === marginName)
    if (!margin) return

    const marginContacts = contactsByMargin[marginName]
    if (!marginContacts || marginContacts.length === 0) return

    // Validate: all contacts in this margin must have the same size
    const firstSize = marginContacts[0].size
    const hasMixedSizes = marginContacts.some((c) => c.size !== firstSize)
    if (hasMixedSizes) {
      throw new Error(
        `All contacts in ${marginName} must be the same size. ` +
          `Found mixed sizes: ${marginContacts.map((c) => `${c.name}(${c.size})`).join(", ")}`,
      )
    }

    // Get contact bounding box size from first contact
    const contactBoundingBoxSize = getContactBoundingBoxSize(firstSize)

    // Determine orientation and direction for this margin
    let orientation: "horizontal" | "vertical"
    let direction: "forward" | "reverse"

    switch (marginName) {
      case "leftMargin":
        orientation = "vertical"
        direction = "forward" // bottom to top (y increases)
        break
      case "topMargin":
        orientation = "horizontal"
        direction = "forward" // left to right (x increases)
        break
      case "rightMargin":
        orientation = "vertical"
        direction = "reverse" // top to bottom (y decreases)
        break
      case "bottomMargin":
        orientation = "horizontal"
        direction = "reverse" // right to left (x decreases)
        break
      case "centerMargin":
        orientation = "horizontal"
        direction = "forward"
        break
      default:
        console.warn(`Unknown margin name: ${marginName}, skipping`)
        return
    }

    // Calculate capacity for this margin
    const gridSpacing = contactBoundingBoxSize
    const dimension = orientation === "vertical" ? margin.height : margin.width
    const capacity = Math.floor(dimension / gridSpacing)

    // Validate: check if contacts fit in this margin
    if (marginContacts.length > capacity) {
      throw new Error(
        `Too many contacts for ${marginName}. ` +
          `Requested: ${marginContacts.length}, Capacity: ${capacity} ` +
          `(${dimension}mm / ${gridSpacing}mm per ${firstSize} contact)`,
      )
    }

    // Determine perpendicularShift for this margin
    // Priority: marginAlignments > defaultAlignment
    const marginAlignment = marginAlignments?.[marginName] || defaultAlignment

    // Calculate grid positions for this margin
    const gridPositions = calculateMarginGridPositions(
      margin,
      contactBoundingBoxSize,
      orientation,
      direction,
      marginAlignment,
      marginName,
    )

    // Map user contacts to positions
    marginContacts.forEach((contact, index) => {
      const pos = gridPositions[index]

      // If contact has specific perpendicularShift different from margin, recalculate position
      let finalPos = pos
      if (
        contact.perpendicularShift &&
        contact.perpendicularShift !== marginAlignment
      ) {
        const customPositions = calculateMarginGridPositions(
          margin,
          contactBoundingBoxSize,
          orientation,
          direction,
          contact.perpendicularShift,
          marginName,
        )
        finalPos = customPositions[index]
      }

      contactPositions.push({
        name: contact.name,
        pcbX: finalPos.pcbX,
        pcbY: finalPos.pcbY,
        marginName: marginName,
        gridIndex: index,
      })

      contactNumber++
    })
  })

  return contactPositions
}

/**
 * Get all possible contact positions for a molecule's margins.
 * Returns a grid of all valid positions organized by margin.
 * This can be pre-calculated and used for position lookup.
 *
 * @param margins - Array of margin boxes from molecule calculation
 * @param contactSize - Size of contacts ("Medium" or "Large")
 * @param perpendicularShift - How to align contacts within margins (default: "center")
 * @returns MoleculeContactGrid with all possible positions for each margin
 */
export function getAllMarginPositions(
  margins: MarginBox[],
  contactSize: ContactSize,
  perpendicularShift: ContactPerpendicularShift = "center",
  align: ContactAlign = "center",
): MoleculeContactGrid {
  const contactBoundingBoxSize = getContactBoundingBoxSize(contactSize)
  const grid: MoleculeContactGrid = { margins: {} }

  // Determine molecule type
  const centerMargin = margins.find((m) => m.name === "centerMargin")
  const is2Pin = centerMargin && margins.length === 1

  // Define margin processing order
  const marginOrder = is2Pin
    ? ["centerMargin"]
    : ["leftMargin", "topMargin", "rightMargin", "bottomMargin"]

  marginOrder.forEach((marginName) => {
    const margin = margins.find((m) => m.name === marginName)
    if (!margin) return

    // Determine orientation and direction for this margin
    let orientation: "horizontal" | "vertical"
    let direction: "forward" | "reverse"

    switch (marginName) {
      case "leftMargin":
        orientation = "vertical"
        direction = "forward"
        break
      case "topMargin":
        orientation = "horizontal"
        direction = "forward"
        break
      case "rightMargin":
        orientation = "vertical"
        direction = "reverse"
        break
      case "bottomMargin":
        orientation = "horizontal"
        direction = "reverse"
        break
      case "centerMargin":
        orientation = "horizontal"
        direction = "forward"
        break
      default:
        return
    }

    // Calculate all positions for this margin
    const gridPositions = calculateMarginGridPositions(
      margin,
      contactBoundingBoxSize,
      orientation,
      direction,
      perpendicularShift,
      marginName,
      align,
    )

    // Calculate capacity
    const gridSpacing = contactBoundingBoxSize
    const dimension = orientation === "vertical" ? margin.height : margin.width
    const capacity = Math.floor(dimension / gridSpacing)

    // Store positions with index
    const positions = gridPositions.map((pos, index) => ({
      pcbX: pos.pcbX,
      pcbY: pos.pcbY,
      index: index,
    }))

    // Add to grid
    const marginPositions: MarginPositions = {
      marginName,
      contactSize,
      perpendicularShift,
      capacity,
      positions,
    }

    // Type-safe assignment
    if (marginName === "leftMargin") grid.margins.leftMargin = marginPositions
    else if (marginName === "topMargin")
      grid.margins.topMargin = marginPositions
    else if (marginName === "rightMargin")
      grid.margins.rightMargin = marginPositions
    else if (marginName === "bottomMargin")
      grid.margins.bottomMargin = marginPositions
    else if (marginName === "centerMargin")
      grid.margins.centerMargin = marginPositions
  })

  return grid
}

/**
 * Look up a specific position by margin name and index.
 *
 * @param grid - Pre-calculated contact grid from getAllMarginPositions()
 * @param marginName - Name of the margin ("leftMargin", "topMargin", etc.)
 * @param index - Position index within that margin (0-based)
 * @returns Position coordinates or undefined if not found
 */
export function getPositionByIndex(
  grid: MoleculeContactGrid,
  marginName:
    | "leftMargin"
    | "topMargin"
    | "rightMargin"
    | "bottomMargin"
    | "centerMargin",
  index: number,
): { pcbX: number; pcbY: number } | undefined {
  const marginPositions = grid.margins[marginName]
  if (!marginPositions) return undefined

  if (index < 0 || index >= marginPositions.positions.length) {
    return undefined
  }

  const pos = marginPositions.positions[index]
  return { pcbX: pos.pcbX, pcbY: pos.pcbY }
}

/**
 * Convert contact size to bounding box dimension
 */
function getContactBoundingBoxSize(size: ContactSize): number {
  return size === "Medium" ? 2 : 6
}

/**
 * Normalize align aliases to canonical values
 */
function normalizeAlign(
  align: ContactAlign,
): "left" | "center" | "right" | "space-between" {
  if (align === "ccw" || align === "counterclockwise") {
    return "left"
  } else if (align === "cw" || align === "clockwise") {
    return "right"
  } else if (align === "c") {
    return "center"
  } else if (align === "sb") {
    return "space-between"
  }
  return align as "left" | "center" | "right" | "space-between"
}

/**
 * Calculate grid positions within a single margin
 */
function calculateMarginGridPositions(
  margin: MarginBox,
  contactBoundingBoxSize: number,
  orientation: "horizontal" | "vertical",
  direction: "forward" | "reverse",
  perpendicularShift: ContactPerpendicularShift = "center",
  marginName?: string,
  align: ContactAlign = "center",
  numContactsToPlace?: number, // Optional: if provided, only calculate positions for this many contacts
  customSpacing?: number, // Optional: custom spacing between contact centers (overrides default)
  padding?: number, // Optional: padding to shift group along primary axis (positive = clockwise, negative = counterclockwise)
): Array<{ pcbX: number; pcbY: number }> {
  const positions: Array<{ pcbX: number; pcbY: number }> = []
  // Grid spacing: use custom spacing if provided, otherwise default to contact bounding box size
  const gridSpacing = customSpacing ?? contactBoundingBoxSize
  const contactOffset = contactBoundingBoxSize / 2 // Offset from edge to contact center

  // Calculate perpendicular shift amount based on perpendicularShift setting (shifts entire row/column)
  // Shift is perpendicular to the contact arrangement direction
  // Direction depends on which margin we're on relative to board center
  let perpendicularShiftAmount = 0

  if (typeof perpendicularShift === "number") {
    // Numeric shift: use value directly
    // Positive values shift away from center, negative shift toward center
    // For left/bottom margins, positive values are negative in coordinate space
    const direction =
      marginName === "leftMargin" || marginName === "bottomMargin" ? -1 : 1
    perpendicularShiftAmount = direction * perpendicularShift
  } else if (perpendicularShift !== "center") {
    // String shift: use fixed ±2mm
    // Determine shift direction based on margin position
    let shiftAwayFromCenter = 0

    if (marginName === "leftMargin") {
      // Left margin: negative X is away from center
      shiftAwayFromCenter = -2
    } else if (marginName === "rightMargin") {
      // Right margin: positive X is away from center
      shiftAwayFromCenter = 2
    } else if (marginName === "topMargin") {
      // Top margin: positive Y is away from center
      shiftAwayFromCenter = 2
    } else if (marginName === "bottomMargin") {
      // Bottom margin: negative Y is away from center
      shiftAwayFromCenter = -2
    }

    if (perpendicularShift === "outer") {
      perpendicularShiftAmount = shiftAwayFromCenter // Shift toward board edge
    } else if (perpendicularShift === "inner") {
      perpendicularShiftAmount = -shiftAwayFromCenter // Shift toward board center
    }
  }
  // "center" has no perpendicular shift (perpendicularShiftAmount = 0)

  if (orientation === "vertical") {
    // Vertical margin: contacts arranged along y-axis
    const capacity = Math.floor(margin.height / gridSpacing)
    const numContacts = numContactsToPlace ?? capacity // Use actual number if provided, otherwise capacity

    // Normalize align value (ccw/counterclockwise -> left, cw/clockwise -> right)
    const normalizedAlign = normalizeAlign(align)

    // Special handling for space-between: distribute contacts to fill entire margin
    if (normalizedAlign === "space-between") {
      if (numContacts === 0) {
        return positions // No contacts to place
      } else if (numContacts === 1) {
        // Single contact: center it
        const y = margin.pcbY
        positions.push({
          pcbX: margin.pcbX + perpendicularShiftAmount,
          pcbY: y,
        })
      } else {
        // Multiple contacts: first at start, last at end, middle distributed evenly
        const availableSpace = margin.height - contactBoundingBoxSize // Space for contact centers to move within
        const spaceBetween = availableSpace / (numContacts - 1)
        const startY = margin.pcbY - margin.height / 2 + contactOffset

        for (let i = 0; i < numContacts; i++) {
          const y =
            direction === "forward"
              ? startY + i * spaceBetween
              : margin.pcbY +
                margin.height / 2 -
                contactOffset -
                i * spaceBetween

          positions.push({
            pcbX: margin.pcbX + perpendicularShiftAmount,
            pcbY: y,
          })
        }
      }
    } else {
      // Standard align modes: left, center, right
      // Calculate used space: (n-1) gaps between contacts + contact size at edges
      const usedSpace =
        numContacts > 0
          ? (numContacts - 1) * gridSpacing + contactBoundingBoxSize
          : 0
      const leftoverSpace = margin.height - usedSpace

      // Calculate alignment offset based on align setting (along primary axis)
      let alignmentOffset = 0
      if (normalizedAlign === "center") {
        alignmentOffset = Math.round(leftoverSpace / 2 / 2) * 2
      } else if (normalizedAlign === "left") {
        alignmentOffset = 0 // Start at the beginning of the margin
      } else if (normalizedAlign === "right") {
        alignmentOffset = leftoverSpace // Start at the end minus contact group
      }

      // Apply padding: positive = clockwise (up for left margin, down for right margin)
      // For both forward and reverse directions, positive padding should move clockwise
      if (padding !== undefined) {
        alignmentOffset += padding // Positive padding always adds to offset (clockwise for both directions)
      }

      const startY =
        margin.pcbY - margin.height / 2 + contactOffset + alignmentOffset

      for (let i = 0; i < numContacts; i++) {
        const y =
          direction === "forward"
            ? startY + i * gridSpacing
            : margin.pcbY +
              margin.height / 2 -
              contactOffset -
              alignmentOffset -
              i * gridSpacing

        positions.push({
          pcbX: margin.pcbX + perpendicularShiftAmount, // Apply perpendicular shift in X
          pcbY: y,
        })
      }
    }
  } else {
    // Horizontal margin: contacts arranged along x-axis
    const capacity = Math.floor(margin.width / gridSpacing)
    const numContacts = numContactsToPlace ?? capacity // Use actual number if provided, otherwise capacity

    // Normalize align value (ccw/counterclockwise -> left, cw/clockwise -> right)
    const normalizedAlign = normalizeAlign(align)

    // Special handling for space-between: distribute contacts to fill entire margin
    if (normalizedAlign === "space-between") {
      if (numContacts === 0) {
        return positions // No contacts to place
      } else if (numContacts === 1) {
        // Single contact: center it
        const x = margin.pcbX
        positions.push({
          pcbX: x,
          pcbY: margin.pcbY + perpendicularShiftAmount,
        })
      } else {
        // Multiple contacts: first at start, last at end, middle distributed evenly
        const availableSpace = margin.width - contactBoundingBoxSize // Space for contact centers to move within
        const spaceBetween = availableSpace / (numContacts - 1)
        const startX = margin.pcbX - margin.width / 2 + contactOffset

        for (let i = 0; i < numContacts; i++) {
          const x =
            direction === "forward"
              ? startX + i * spaceBetween
              : margin.pcbX +
                margin.width / 2 -
                contactOffset -
                i * spaceBetween

          positions.push({
            pcbX: x,
            pcbY: margin.pcbY + perpendicularShiftAmount,
          })
        }
      }
    } else {
      // Standard align modes: left, center, right
      // Calculate used space: (n-1) gaps between contacts + contact size at edges
      const usedSpace =
        numContacts > 0
          ? (numContacts - 1) * gridSpacing + contactBoundingBoxSize
          : 0
      const leftoverSpace = margin.width - usedSpace

      // Calculate alignment offset based on align setting (along primary axis)
      let alignmentOffset = 0
      if (normalizedAlign === "center") {
        alignmentOffset = Math.round(leftoverSpace / 2 / 2) * 2
      } else if (normalizedAlign === "left") {
        alignmentOffset = 0 // Start at the beginning of the margin
      } else if (normalizedAlign === "right") {
        alignmentOffset = leftoverSpace // Start at the end minus contact group
      }

      // Apply padding: positive = clockwise (right for top margin, left for bottom margin)
      // For both forward and reverse directions, positive padding should move clockwise
      if (padding !== undefined) {
        alignmentOffset += padding // Positive padding always adds to offset (clockwise for both directions)
      }

      const startX =
        margin.pcbX - margin.width / 2 + contactOffset + alignmentOffset

      for (let i = 0; i < numContacts; i++) {
        const x =
          direction === "forward"
            ? startX + i * gridSpacing
            : margin.pcbX +
              margin.width / 2 -
              contactOffset -
              alignmentOffset -
              i * gridSpacing

        positions.push({
          pcbX: x,
          pcbY: margin.pcbY + perpendicularShiftAmount, // Apply perpendicular shift in Y
        })
      }
    }
  }

  return positions
}

/**
 * Get positions for a specific margin with a specific number of contacts.
 * This is useful when you want alignment to work correctly for a subset of contacts.
 */
export function getMarginPositions(
  margin: MarginBox,
  contactSize: ContactSize,
  perpendicularShift: ContactPerpendicularShift,
  align: ContactAlign,
  numContacts: number,
  marginName: string,
  customSpacing?: number, // Optional: custom spacing between contact centers
  padding?: number, // Optional: padding to shift group along primary axis (positive = clockwise, negative = counterclockwise)
): Array<{ pcbX: number; pcbY: number }> {
  const contactBoundingBoxSize = getContactBoundingBoxSize(contactSize)

  // Determine orientation and direction for this margin
  let orientation: "horizontal" | "vertical"
  let direction: "forward" | "reverse"

  switch (marginName) {
    case "leftMargin":
      orientation = "vertical"
      direction = "forward"
      break
    case "topMargin":
      orientation = "horizontal"
      direction = "forward"
      break
    case "rightMargin":
      orientation = "vertical"
      direction = "reverse"
      break
    case "bottomMargin":
      orientation = "horizontal"
      direction = "reverse"
      break
    case "centerMargin":
      orientation = "horizontal"
      direction = "forward"
      break
    default:
      orientation = "horizontal"
      direction = "forward"
  }

  return calculateMarginGridPositions(
    margin,
    contactBoundingBoxSize,
    orientation,
    direction,
    perpendicularShift,
    marginName,
    align,
    numContacts,
    customSpacing,
    padding,
  )
}

/**
 * Look up a contact position by name
 * @param contactName - Name of the contact (e.g., "MC1", "MC5")
 * @param contactPositions - Array of all valid contact positions
 * @returns The contact position if found, undefined otherwise
 */
export function getContactPositionByName(
  contactName: string,
  contactPositions: ContactPosition[],
): ContactPosition | undefined {
  return contactPositions.find((pos) => pos.name === contactName)
}
