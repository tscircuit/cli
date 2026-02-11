// ===== MarginPackerInternalsDemo.ts =====
// Shows the internal calculation process of MoleculeMarginPacker.ts
// Demonstrates what data is available at each step
// Run with: bun run src/MarginPackerTests/MarginPackerInternalsDemo.ts

import {
  calculateMolecule,
  MarginBox,
  MoleculeProps,
} from "../MoleculeCalculator"
import type { ContactPerpendicularShift } from "../MoleculeMarginPacker"

function runTestCase(
  testName: string,
  moleculeConfig: Omit<MoleculeProps, "children">,
  contactBoundingBoxSize: number,
  perpendicularShift: ContactPerpendicularShift,
) {
  console.log("=".repeat(80))
  console.log(`TEST CASE: ${testName}`)
  console.log("=".repeat(80))
  console.log()

  // Setup: Calculate molecule
  const moleculeResult = calculateMolecule(moleculeConfig)

  console.log("INPUT DATA:")
  console.log("-".repeat(80))
  console.log(`Molecule: ${moleculeConfig.size} with ${moleculeConfig.pinType}`)
  console.log(
    `Contact type: ${contactBoundingBoxSize === 2 ? "Medium" : "Large"} (${contactBoundingBoxSize}mm bounding box)`,
  )
  console.log(`Alignment: ${perpendicularShift}`)
  console.log()

  console.log("Available margins from calculateMolecule():")
  console.log(JSON.stringify(moleculeResult.margins, null, 2))
  console.log()

  // Manually walk through the calculateContactPositions logic
  console.log("=".repeat(80))
  console.log("WALKING THROUGH calculateContactPositions()")
  console.log("=".repeat(80))
  console.log()

  const contactPositions: Array<{
    name: string
    pcbX: number
    pcbY: number
    marginName: string
    gridIndex: number
  }> = []

  let contactNumber = 1

  // Determine molecule type
  const centerMargin = moleculeResult.margins.find(
    (m) => m.name === "centerMargin",
  )
  const is2Pin = centerMargin && moleculeResult.margins.length === 1

  console.log(`Molecule type detected: ${is2Pin ? "2-pin" : "4-pin"}`)
  console.log()

  if (!is2Pin) {
    console.log(
      "Processing 4-pin molecule - will process edge margins in clockwise order",
    )
    console.log(
      "Margin order: leftMargin → topMargin → rightMargin → bottomMargin",
    )
    console.log()

    const marginOrder = [
      "leftMargin",
      "topMargin",
      "rightMargin",
      "bottomMargin",
    ]

    marginOrder.forEach((marginName, marginIndex) => {
      const margin = moleculeResult.margins.find((m) => m.name === marginName)
      if (!margin) {
        console.log(`⚠ ${marginName} not found, skipping`)
        return
      }

      console.log("=".repeat(80))
      console.log(`PROCESSING MARGIN ${marginIndex + 1}/4: ${marginName}`)
      console.log("=".repeat(80))
      console.log()

      // Determine orientation and direction
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

      console.log("STEP 1: Margin configuration")
      console.log("-".repeat(40))
      console.log(`  Margin: ${marginName}`)
      console.log(`  Orientation: ${orientation}`)
      console.log(`  Direction: ${direction}`)
      console.log(`  Margin data:`, JSON.stringify(margin, null, 4))
      console.log()

      // Now manually do calculateMarginGridPositions logic
      console.log("STEP 2: Calculate grid parameters")
      console.log("-".repeat(40))

      const gridSpacing = contactBoundingBoxSize
      const contactOffset = contactBoundingBoxSize / 2

      console.log(`  gridSpacing: ${gridSpacing}mm (matches contact size)`)
      console.log(
        `  contactOffset: ${contactOffset}mm (half of contact size for centering)`,
      )
      console.log()

      // Calculate capacity
      console.log("STEP 3: Calculate contact capacity")
      console.log("-".repeat(40))

      const isVertical = orientation === "vertical"
      const dimension = isVertical ? margin.height : margin.width
      const numContacts = Math.floor(dimension / gridSpacing)
      const usedSpace = numContacts * gridSpacing
      const leftoverSpace = dimension - usedSpace

      console.log(
        `  Dimension to fill: ${dimension}mm (${isVertical ? "height" : "width"})`,
      )
      console.log(`  Grid spacing: ${gridSpacing}mm`)
      console.log(
        `  Calculation: Math.floor(${dimension} / ${gridSpacing}) = ${numContacts} contacts`,
      )
      console.log(
        `  Used space: ${numContacts} × ${gridSpacing}mm = ${usedSpace}mm`,
      )
      console.log(
        `  Leftover space: ${dimension}mm - ${usedSpace}mm = ${leftoverSpace}mm`,
      )
      console.log()

      // Calculate perpendicular shift amount
      console.log("STEP 4: Calculate perpendicular shift (perpendicularShift)")
      console.log("-".repeat(40))

      let perpendicularShiftAmount = 0
      let shiftAwayFromCenter = 0

      if (marginName === "leftMargin") {
        shiftAwayFromCenter = -2
        console.log(
          `  leftMargin: shiftAwayFromCenter = -2 (negative X is away from center)`,
        )
      } else if (marginName === "rightMargin") {
        shiftAwayFromCenter = 2
        console.log(
          `  rightMargin: shiftAwayFromCenter = +2 (positive X is away from center)`,
        )
      } else if (marginName === "topMargin") {
        shiftAwayFromCenter = 2
        console.log(
          `  topMargin: shiftAwayFromCenter = +2 (positive Y is away from center)`,
        )
      } else if (marginName === "bottomMargin") {
        shiftAwayFromCenter = -2
        console.log(
          `  bottomMargin: shiftAwayFromCenter = -2 (negative Y is away from center)`,
        )
      }

      if (perpendicularShift === "outer") {
        perpendicularShiftAmount = shiftAwayFromCenter
        console.log(
          `  perpendicularShift = "outer" → perpendicularShiftAmount = ${perpendicularShiftAmount} (toward edge)`,
        )
      } else if (perpendicularShift === "inner") {
        perpendicularShiftAmount = -shiftAwayFromCenter
        console.log(
          `  perpendicularShift = "inner" → perpendicularShiftAmount = ${perpendicularShiftAmount} (toward center)`,
        )
      } else {
        perpendicularShiftAmount = 0
        console.log(
          `  perpendicularShift = "center" → perpendicularShiftAmount = 0 (no shift)`,
        )
      }
      console.log()

      // Calculate centering offset for primary axis
      console.log("STEP 5: Calculate centering offset (along arrangement axis)")
      console.log("-".repeat(40))

      const centeringOffset = Math.round(leftoverSpace / 2 / 2) * 2
      console.log(`  Leftover space: ${leftoverSpace}mm`)
      console.log(
        `  Calculation: Math.round((${leftoverSpace} / 2) / 2) * 2 = ${centeringOffset}mm`,
      )
      console.log(
        `  (Centers contacts and maintains 2mm grid perpendicularShift)`,
      )
      console.log()

      // Calculate start position
      console.log("STEP 6: Calculate start position")
      console.log("-".repeat(40))

      if (isVertical) {
        const startY =
          margin.pcbY - margin.height / 2 + contactOffset + centeringOffset
        const shiftedPcbX = margin.pcbX + perpendicularShiftAmount

        console.log(`  Vertical margin (contacts arranged along Y axis):`)
        console.log(`    Base pcbY: ${margin.pcbY}mm (margin center)`)
        console.log(`    Margin half-height: ${margin.height / 2}mm`)
        console.log(
          `    startY = ${margin.pcbY} - ${margin.height / 2} + ${contactOffset} + ${centeringOffset}`,
        )
        console.log(`    startY = ${startY}mm`)
        console.log()
        console.log(`    Base pcbX: ${margin.pcbX}mm (margin center)`)
        console.log(`    Perpendicular shift: ${perpendicularShiftAmount}mm`)
        console.log(
          `    Shifted pcbX = ${margin.pcbX} + ${perpendicularShiftAmount} = ${shiftedPcbX}mm`,
        )
        console.log()

        // Generate positions
        console.log("STEP 7: Generate contact positions")
        console.log("-".repeat(40))

        for (let i = 0; i < numContacts; i++) {
          const y =
            direction === "forward"
              ? startY + i * gridSpacing
              : margin.pcbY +
                margin.height / 2 -
                contactOffset -
                centeringOffset -
                i * gridSpacing

          const pos = {
            name: `MC${contactNumber++}`,
            pcbX: shiftedPcbX,
            pcbY: y,
            marginName: marginName,
            gridIndex: i,
          }

          contactPositions.push(pos)
          console.log(
            `    Contact ${i}: ${pos.name} at (${pos.pcbX}, ${pos.pcbY})`,
          )
        }
      } else {
        const startX =
          margin.pcbX - margin.width / 2 + contactOffset + centeringOffset
        const shiftedPcbY = margin.pcbY + perpendicularShiftAmount

        console.log(`  Horizontal margin (contacts arranged along X axis):`)
        console.log(`    Base pcbX: ${margin.pcbX}mm (margin center)`)
        console.log(`    Margin half-width: ${margin.width / 2}mm`)
        console.log(
          `    startX = ${margin.pcbX} - ${margin.width / 2} + ${contactOffset} + ${centeringOffset}`,
        )
        console.log(`    startX = ${startX}mm`)
        console.log()
        console.log(`    Base pcbY: ${margin.pcbY}mm (margin center)`)
        console.log(`    Perpendicular shift: ${perpendicularShiftAmount}mm`)
        console.log(
          `    Shifted pcbY = ${margin.pcbY} + ${perpendicularShiftAmount} = ${shiftedPcbY}mm`,
        )
        console.log()

        // Generate positions
        console.log("STEP 7: Generate contact positions")
        console.log("-".repeat(40))

        for (let i = 0; i < numContacts; i++) {
          const x =
            direction === "forward"
              ? startX + i * gridSpacing
              : margin.pcbX +
                margin.width / 2 -
                contactOffset -
                centeringOffset -
                i * gridSpacing

          const pos = {
            name: `MC${contactNumber++}`,
            pcbX: x,
            pcbY: shiftedPcbY,
            marginName: marginName,
            gridIndex: i,
          }

          contactPositions.push(pos)
          console.log(
            `    Contact ${i}: ${pos.name} at (${pos.pcbX}, ${pos.pcbY})`,
          )
        }
      }

      console.log()
      console.log(`✓ Generated ${numContacts} contacts for ${marginName}`)
      console.log()
    })
  }

  console.log("=".repeat(80))
  console.log("FINAL RESULT")
  console.log("=".repeat(80))
  console.log()
  console.log(`Total contacts generated: ${contactPositions.length}`)
  console.log()

  console.log("Contact positions data structure:")
  console.log(JSON.stringify(contactPositions.slice(0, 3), null, 2))
  console.log("... (showing first 3 of " + contactPositions.length + " total)")
  console.log()

  console.log("Available data in each ContactPosition object:")
  console.log(
    "  - name: string          // Sequential name like 'MC1', 'MC2', etc.",
  )
  console.log("  - pcbX: number          // X coordinate on PCB (mm)")
  console.log("  - pcbY: number          // Y coordinate on PCB (mm)")
  console.log("  - marginName: string    // Which margin this contact is in")
  console.log("  - gridIndex: number     // Index within that margin (0-based)")
  console.log()

  console.log("Grouping by margin:")
  const byMargin: Record<string, number> = {}
  contactPositions.forEach((pos) => {
    byMargin[pos.marginName] = (byMargin[pos.marginName] || 0) + 1
  })
  console.log(JSON.stringify(byMargin, null, 2))
  console.log()

  console.log("=".repeat(80))
  console.log("END OF TEST CASE")
  console.log("=".repeat(80))
  console.log()
  console.log()
}

// Run test cases
console.log("MOLECULE MARGIN PACKER - INTERNAL CALCULATION WALKTHROUGH")
console.log("Running multiple test cases to show different scenarios")
console.log()
console.log()

// Test Case 1: 32x32mm Large molecule with Medium contacts
runTestCase(
  "32x32mm with Large pins, Medium contacts, outer perpendicularShift",
  {
    type: "4pin",
    size: "32x32",
    pinType: "MachinePinLargeStandard",
    wing: "nominal",
    roundEdges: true,
  },
  2, // Medium contacts
  "outer",
)

// Test Case 2: 8x8mm Medium molecule with Medium contacts
runTestCase(
  "8x8mm with Medium pins, Medium contacts, center perpendicularShift",
  {
    type: "4pin",
    size: "8x8",
    pinType: "MachinePinMediumStandard",
    wing: "nominal",
    roundEdges: true,
  },
  2, // Medium contacts
  "center",
)

console.log("=".repeat(80))
console.log("ALL TEST CASES COMPLETE")
console.log("=".repeat(80))
