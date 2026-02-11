// ===== MarginPositionLookupDemo.ts =====
// Demonstrates pre-calculated contact position lookup
// Run with: bun run src/MarginPackerTests/MarginPositionLookupDemo.ts

import { calculateMolecule } from "../MoleculeCalculator"
import {
  getAllMarginPositions,
  getPositionByIndex,
} from "../MoleculeMarginPacker"

console.log("=".repeat(80))
console.log("MARGIN POSITION LOOKUP - DEMONSTRATION")
console.log("=".repeat(80))
console.log()

// Setup: Calculate molecules
const molecule32x32Large = calculateMolecule({
  type: "4pin",
  size: "32x32",
  pinType: "MachinePinLargeStandard",
  wing: "nominal",
  roundEdges: true,
})

const molecule8x8Med = calculateMolecule({
  type: "4pin",
  size: "8x8",
  pinType: "MachinePinMediumStandard",
  wing: "nominal",
  roundEdges: true,
})

console.log("Test Molecules:")
console.log(`  1. 32x32mm with Large pins`)
console.log(`  2. 8x8mm with Medium pins`)
console.log()

// Example 1: Get all possible Medium contact positions (32x32 Large molecule)
console.log("=".repeat(80))
console.log("EXAMPLE 1: 32x32mm Large Molecule - Medium Contact Positions")
console.log("=".repeat(80))
console.log()

const mediumGrid32x32 = getAllMarginPositions(
  molecule32x32Large.margins,
  "Medium",
  "center",
)

console.log("Medium Contact Grid (center perpendicularShift):")
console.log()

Object.entries(mediumGrid32x32.margins).forEach(([marginName, marginData]) => {
  if (!marginData || marginName === "centerMargin") return

  console.log(`${marginName}:`)
  console.log(`  Contact Size: ${marginData.contactSize}`)
  console.log(`  Alignment: ${marginData.perpendicularShift}`)
  console.log(`  Capacity: ${marginData.capacity} positions`)
  console.log(`  Positions:`)
  marginData.positions.forEach((pos) => {
    console.log(`    [${pos.index}]: (${pos.pcbX}, ${pos.pcbY})`)
  })
  console.log()
})

// Example 2: Get all possible Large contact positions (32x32 Large molecule)
console.log("=".repeat(80))
console.log("EXAMPLE 2: 32x32mm Large Molecule - Large Contact Positions")
console.log("=".repeat(80))
console.log()

const largeGrid32x32 = getAllMarginPositions(
  molecule32x32Large.margins,
  "Large",
  "center",
)

console.log("Large Contact Grid (center perpendicularShift):")
console.log()

Object.entries(largeGrid32x32.margins).forEach(([marginName, marginData]) => {
  if (!marginData || marginName === "centerMargin") return

  console.log(`${marginName}:`)
  console.log(`  Contact Size: ${marginData.contactSize}`)
  console.log(`  Alignment: ${marginData.perpendicularShift}`)
  console.log(`  Capacity: ${marginData.capacity} positions`)
  console.log(`  Positions:`)
  marginData.positions.forEach((pos) => {
    console.log(`    [${pos.index}]: (${pos.pcbX}, ${pos.pcbY})`)
  })
  console.log()
})

// Example 3: 8x8mm Medium Molecule - Medium Contact Positions
console.log("=".repeat(80))
console.log("EXAMPLE 3: 8x8mm Medium Molecule - Medium Contact Positions")
console.log("=".repeat(80))
console.log()

const mediumGrid8x8 = getAllMarginPositions(
  molecule8x8Med.margins,
  "Medium",
  "center",
)

console.log("Medium Contact Grid (center perpendicularShift):")
console.log()

Object.entries(mediumGrid8x8.margins).forEach(([marginName, marginData]) => {
  if (!marginData || marginName === "centerMargin") return

  console.log(`${marginName}:`)
  console.log(`  Contact Size: ${marginData.contactSize}`)
  console.log(`  Alignment: ${marginData.perpendicularShift}`)
  console.log(`  Capacity: ${marginData.capacity} positions`)
  console.log(`  Positions:`)
  marginData.positions.forEach((pos) => {
    console.log(`    [${pos.index}]: (${pos.pcbX}, ${pos.pcbY})`)
  })
  console.log()
})

// Example 4: Position lookup by index
console.log("=".repeat(80))
console.log("EXAMPLE 4: Position Lookup by Index")
console.log("=".repeat(80))
console.log()

console.log("Looking up specific positions from 32x32 Medium grid:")
console.log()

const lookups32x32 = [
  { margin: "leftMargin" as const, index: 0 },
  { margin: "leftMargin" as const, index: 2 },
  { margin: "topMargin" as const, index: 5 },
  { margin: "rightMargin" as const, index: 0 },
  { margin: "bottomMargin" as const, index: 12 },
]

lookups32x32.forEach((lookup) => {
  const pos = getPositionByIndex(mediumGrid32x32, lookup.margin, lookup.index)
  if (pos) {
    console.log(
      `  ${lookup.margin}[${lookup.index}]: (${pos.pcbX}, ${pos.pcbY})`,
    )
  } else {
    console.log(`  ${lookup.margin}[${lookup.index}]: NOT FOUND`)
  }
})
console.log()

console.log("Looking up specific positions from 8x8 Medium grid:")
console.log()

const lookups8x8 = [
  { margin: "leftMargin" as const, index: 0 },
  { margin: "leftMargin" as const, index: 2 },
  { margin: "topMargin" as const, index: 1 },
  { margin: "rightMargin" as const, index: 0 },
]

lookups8x8.forEach((lookup) => {
  const pos = getPositionByIndex(mediumGrid8x8, lookup.margin, lookup.index)
  if (pos) {
    console.log(
      `  ${lookup.margin}[${lookup.index}]: (${pos.pcbX}, ${pos.pcbY})`,
    )
  } else {
    console.log(`  ${lookup.margin}[${lookup.index}]: NOT FOUND`)
  }
})
console.log()

// Example 5: Different perpendicularShifts
console.log("=".repeat(80))
console.log("EXAMPLE 5: Different Alignments")
console.log("=".repeat(80))
console.log()

const outerGrid = getAllMarginPositions(
  molecule32x32Large.margins,
  "Medium",
  "outer",
)
const centerGrid = getAllMarginPositions(
  molecule32x32Large.margins,
  "Medium",
  "center",
)
const innerGrid = getAllMarginPositions(
  molecule32x32Large.margins,
  "Medium",
  "inner",
)

console.log("Comparing leftMargin position 0 across perpendicularShifts:")
console.log()

const outerPos = outerGrid.margins.leftMargin?.positions[0]
const centerPos = centerGrid.margins.leftMargin?.positions[0]
const innerPos = innerGrid.margins.leftMargin?.positions[0]

console.log(
  `  Outer perpendicularShift:  ${outerPos ? `(${outerPos.pcbX}, ${outerPos.pcbY})` : "N/A"}`,
)
console.log(
  `  Center perpendicularShift: ${centerPos ? `(${centerPos.pcbX}, ${centerPos.pcbY})` : "N/A"}`,
)
console.log(
  `  Inner perpendicularShift:  ${innerPos ? `(${innerPos.pcbX}, ${innerPos.pcbY})` : "N/A"}`,
)
console.log()

console.log("Comparing topMargin position 5 across perpendicularShifts:")
console.log()

const outerPosTop = outerGrid.margins.topMargin?.positions[5]
const centerPosTop = centerGrid.margins.topMargin?.positions[5]
const innerPosTop = innerGrid.margins.topMargin?.positions[5]

console.log(
  `  Outer perpendicularShift:  ${outerPosTop ? `(${outerPosTop.pcbX}, ${outerPosTop.pcbY})` : "N/A"}`,
)
console.log(
  `  Center perpendicularShift: ${centerPosTop ? `(${centerPosTop.pcbX}, ${centerPosTop.pcbY})` : "N/A"}`,
)
console.log(
  `  Inner perpendicularShift:  ${innerPosTop ? `(${innerPosTop.pcbX}, ${innerPosTop.pcbY})` : "N/A"}`,
)
console.log()

// Example 6: Usage pattern - how you'd use this in a component
console.log("=".repeat(80))
console.log("EXAMPLE 6: Usage Pattern in Component")
console.log("=".repeat(80))
console.log()

console.log("Typical usage pattern:")
console.log()
console.log("```typescript")
console.log("// Pre-calculate grid once")
console.log("const contactGrid = getAllMarginPositions(")
console.log("  moleculeResult.margins,")
console.log("  'Medium',")
console.log("  'center'")
console.log(");")
console.log()
console.log("// Look up positions as needed")
console.log("const vccPos = getPositionByIndex(contactGrid, 'leftMargin', 0);")
console.log("const gndPos = getPositionByIndex(contactGrid, 'leftMargin', 1);")
console.log("const txPos = getPositionByIndex(contactGrid, 'topMargin', 0);")
console.log()
console.log("// Use in JSX")
console.log(
  "<MachineContactMedium name='VCC' pcbX={vccPos.pcbX} pcbY={vccPos.pcbY} />",
)
console.log(
  "<MachineContactMedium name='GND' pcbX={gndPos.pcbX} pcbY={gndPos.pcbY} />",
)
console.log(
  "<MachineContactMedium name='TX' pcbX={txPos.pcbX} pcbY={txPos.pcbY} />",
)
console.log("```")
console.log()

// Example 7: Show capacity information
console.log("=".repeat(80))
console.log("EXAMPLE 7: Capacity Information")
console.log("=".repeat(80))
console.log()

console.log("32x32mm Large Molecule capacity:")
console.log()

console.log("  Medium contacts:")
Object.entries(mediumGrid32x32.margins).forEach(([marginName, marginData]) => {
  if (!marginData || marginName === "centerMargin") return
  console.log(`    ${marginName}: ${marginData.capacity} positions available`)
})
console.log()

console.log("  Large contacts:")
Object.entries(largeGrid32x32.margins).forEach(([marginName, marginData]) => {
  if (!marginData || marginName === "centerMargin") return
  console.log(`    ${marginName}: ${marginData.capacity} positions available`)
})
console.log()

console.log("8x8mm Medium Molecule capacity:")
console.log()

console.log("  Medium contacts:")
Object.entries(mediumGrid8x8.margins).forEach(([marginName, marginData]) => {
  if (!marginData || marginName === "centerMargin") return
  console.log(`    ${marginName}: ${marginData.capacity} positions available`)
})
console.log()

console.log("=".repeat(80))
console.log("DEMONSTRATION COMPLETE")
console.log("=".repeat(80))
console.log()
console.log("Key Takeaways:")
console.log(
  "  1. Pre-calculate all valid positions with getAllMarginPositions()",
)
console.log("  2. Store the grid for reuse (no need to recalculate)")
console.log("  3. Look up specific positions with getPositionByIndex()")
console.log("  4. Use margin name + index to reference any valid position")
console.log("  5. Different contact sizes have different capacities")
console.log("  6. Alignments affect position coordinates")
console.log()
