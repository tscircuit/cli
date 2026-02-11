// ===== MarginPackerDemo.ts =====
// Demonstrates how MoleculeMarginPacker.ts works internally
// Run with: bun run src/MarginPackerTests/MarginPackerDemo.ts

import { calculateMolecule } from "../MoleculeCalculator"
import { calculateContactPositions } from "../MoleculeMarginPacker"

console.log("=".repeat(80))
console.log("MOLECULE MARGIN PACKER - DEMONSTRATION")
console.log("=".repeat(80))
console.log()

// Test case: Molecule32x32Large with Medium contacts
console.log("TEST CASE: Molecule 32x32mm with Large pins, Medium contacts")
console.log("-".repeat(80))
console.log()

// Step 1: Calculate the molecule to get margins
console.log("STEP 1: Calculate molecule dimensions and margins")
console.log("-".repeat(80))

const moleculeResult = calculateMolecule({
  type: "4pin",
  size: "32x32",
  pinType: "MachinePinLargeStandard",
  wing: "nominal",
  roundEdges: true,
})

console.log(
  `Board dimensions: ${moleculeResult.boardNominalWidth}mm × ${moleculeResult.boardNominalHeight}mm`,
)
console.log(`Number of margins: ${moleculeResult.margins.length}`)
console.log()

console.log("Margin details:")
moleculeResult.margins.forEach((margin) => {
  console.log(`  ${margin.name}:`)
  console.log(`    Center position: (${margin.pcbX}, ${margin.pcbY})`)
  console.log(`    Size: ${margin.width}mm × ${margin.height}mm`)
})
console.log()

// Step 2: Define contact parameters
console.log("STEP 2: Define contact parameters")
console.log("-".repeat(80))

const contactBoundingBoxSize = 2 // Medium contacts
const gridSpacing = contactBoundingBoxSize

console.log(`Contact type: Medium`)
console.log(`Contact bounding box size: ${contactBoundingBoxSize}mm`)
console.log(`Grid spacing: ${gridSpacing}mm (must match contact size)`)
console.log()

// Step 3: Show what happens for each margin
console.log("STEP 3: Calculate positions for each margin")
console.log("-".repeat(80))
console.log()

const perpendicularShifts = ["outer", "center", "inner"] as const

perpendicularShifts.forEach((perpendicularShift) => {
  console.log(
    `>>> PERPENDICULAR SHIFT: "${perpendicularShift.toUpperCase()}" <<<`,
  )
  console.log()

  const contactPositions = calculateContactPositions(
    moleculeResult.margins,
    contactBoundingBoxSize,
    perpendicularShift,
  )

  // Group positions by margin
  const positionsByMargin: Record<string, typeof contactPositions> = {}
  contactPositions.forEach((pos) => {
    if (!positionsByMargin[pos.marginName]) {
      positionsByMargin[pos.marginName] = []
    }
    positionsByMargin[pos.marginName].push(pos)
  })

  // Show details for each margin
  ;["leftMargin", "topMargin", "rightMargin", "bottomMargin"].forEach(
    (marginName) => {
      const margin = moleculeResult.margins.find((m) => m.name === marginName)
      if (!margin) return

      const positions = positionsByMargin[marginName] || []

      console.log(`  ${marginName}:`)
      console.log(`    Margin center: (${margin.pcbX}, ${margin.pcbY})`)
      console.log(`    Margin size: ${margin.width}mm × ${margin.height}mm`)

      // Calculate capacity and leftover
      const isVertical =
        marginName === "leftMargin" || marginName === "rightMargin"
      const dimension = isVertical ? margin.height : margin.width
      const numContacts = Math.floor(dimension / gridSpacing)
      const usedSpace = numContacts * gridSpacing
      const leftoverSpace = dimension - usedSpace

      console.log(
        `    Capacity: ${numContacts} contacts (${usedSpace}mm used, ${leftoverSpace}mm leftover)`,
      )

      // Calculate perpendicular shift amount
      let shiftDescription = ""
      let perpendicularShiftAmount = 0

      if (perpendicularShift === "center") {
        shiftDescription = "no shift (centered)"
        perpendicularShiftAmount = 0
      } else {
        let shiftAwayFromCenter = 0
        if (marginName === "leftMargin") shiftAwayFromCenter = -2
        else if (marginName === "rightMargin") shiftAwayFromCenter = 2
        else if (marginName === "topMargin") shiftAwayFromCenter = 2
        else if (marginName === "bottomMargin") shiftAwayFromCenter = -2

        if (perpendicularShift === "outer") {
          perpendicularShiftAmount = shiftAwayFromCenter
          shiftDescription = `shift ${Math.abs(perpendicularShiftAmount)}mm toward board edge`
        } else if (perpendicularShift === "inner") {
          perpendicularShiftAmount = -shiftAwayFromCenter
          shiftDescription = `shift ${Math.abs(perpendicularShiftAmount)}mm toward board center`
        }
      }

      const basePosition = isVertical ? margin.pcbX : margin.pcbY
      const shiftedPosition = basePosition + perpendicularShiftAmount
      const axis = isVertical ? "X" : "Y"

      console.log(`    Perpendicular shift: ${shiftDescription}`)
      console.log(
        `    Base pcb${axis}: ${basePosition}mm → Shifted pcb${axis}: ${shiftedPosition}mm`,
      )
      console.log(`    Generated contacts: ${positions.length}`)

      if (positions.length > 0) {
        const first = positions[0]
        const last = positions[positions.length - 1]
        console.log(
          `      First: ${first.name} at (${first.pcbX}, ${first.pcbY})`,
        )
        if (positions.length > 1) {
          console.log(
            `      Last:  ${last.name} at (${last.pcbX}, ${last.pcbY})`,
          )
        }
      }
      console.log()
    },
  )

  console.log(`  Total contacts generated: ${contactPositions.length}`)
  console.log()
  console.log("=".repeat(80))
  console.log()
})

// Step 4: Summary comparison
console.log("STEP 4: Summary Comparison")
console.log("-".repeat(80))
console.log()

console.log(
  "Perpendicular position comparison (margin center perpendicular axis):",
)
console.log()

const table: Array<{
  margin: string
  outer: number
  center: number
  inner: number
}> = []
;["leftMargin", "topMargin", "rightMargin", "bottomMargin"].forEach(
  (marginName) => {
    const margin = moleculeResult.margins.find((m) => m.name === marginName)
    if (!margin) return

    const isVertical =
      marginName === "leftMargin" || marginName === "rightMargin"
    const basePosition = isVertical ? margin.pcbX : margin.pcbY

    const row = {
      margin: marginName,
      outer: 0,
      center: basePosition,
      inner: 0,
    }

    // Calculate outer position
    let shiftAwayFromCenter = 0
    if (marginName === "leftMargin") shiftAwayFromCenter = -2
    else if (marginName === "rightMargin") shiftAwayFromCenter = 2
    else if (marginName === "topMargin") shiftAwayFromCenter = 2
    else if (marginName === "bottomMargin") shiftAwayFromCenter = -2

    row.outer = basePosition + shiftAwayFromCenter
    row.inner = basePosition - shiftAwayFromCenter

    table.push(row)
  },
)

console.log("Margin         | Outer | Center | Inner")
console.log("---------------|-------|--------|-------")
table.forEach((row) => {
  const name = row.margin.padEnd(14)
  const outer = row.outer.toString().padStart(5)
  const center = row.center.toString().padStart(6)
  const inner = row.inner.toString().padStart(5)
  console.log(`${name} | ${outer} | ${center} | ${inner}`)
})
console.log()

console.log("Legend:")
console.log("  Outer:  Contacts shifted toward board edges (away from center)")
console.log("  Center: Contacts at margin center (baseline, no shift)")
console.log("  Inner:  Contacts shifted toward board center (away from edges)")
console.log()
console.log("=".repeat(80))
console.log("DEMONSTRATION COMPLETE")
console.log("=".repeat(80))
