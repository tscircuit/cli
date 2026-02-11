// ===== MarginPackerFlexibleDemo.ts =====
// Demonstrates flexible contact placement with user-defined contacts
// Run with: bun run src/MarginPackerTests/MarginPackerFlexibleDemo.ts

import { calculateMolecule } from "../MoleculeCalculator"
import { placeContactsInMargins, ContactRequest } from "../MoleculeMarginPacker"

console.log("=".repeat(80))
console.log("FLEXIBLE CONTACT PLACEMENT - DEMONSTRATION")
console.log("=".repeat(80))
console.log()

// Setup: Calculate molecule
const moleculeResult = calculateMolecule({
  type: "4pin",
  size: "32x32",
  pinType: "MachinePinLargeStandard",
  wing: "nominal",
  roundEdges: true,
})

console.log("Molecule Setup:")
console.log(`  Size: 32x32mm with Large pins`)
console.log(`  Available margins:`)
moleculeResult.margins.forEach((m) => {
  if (m.name !== "centerMargin") {
    console.log(
      `    ${m.name}: ${m.width}mm × ${m.height}mm at (${m.pcbX}, ${m.pcbY})`,
    )
  }
})
console.log()

// Example 1: Basic flexible placement with custom names
console.log("=".repeat(80))
console.log("EXAMPLE 1: Basic Flexible Placement")
console.log("=".repeat(80))
console.log()

const basicContacts: ContactRequest[] = [
  { name: "VCC", marginName: "leftMargin", size: "Medium" },
  { name: "GND", marginName: "leftMargin", size: "Medium" },
  { name: "TX", marginName: "topMargin", size: "Medium" },
  { name: "RX", marginName: "topMargin", size: "Medium" },
  { name: "CLK", marginName: "rightMargin", size: "Medium" },
]

console.log("Contact Requests:")
basicContacts.forEach((c) => {
  console.log(`  ${c.name}: ${c.marginName} (${c.size})`)
})
console.log()

const basicPositions = placeContactsInMargins(
  moleculeResult.margins,
  basicContacts,
  "center", // default perpendicularShift
)

console.log("Calculated Positions:")
basicPositions.forEach((pos) => {
  console.log(
    `  ${pos.name}: (${pos.pcbX}, ${pos.pcbY}) - ${pos.marginName}[${pos.gridIndex}]`,
  )
})
console.log()

// Example 2: Per-contact perpendicularShift
console.log("=".repeat(80))
console.log("EXAMPLE 2: Per-Contact Alignment")
console.log("=".repeat(80))
console.log()

const alignedContacts: ContactRequest[] = [
  {
    name: "VCC",
    marginName: "leftMargin",
    size: "Medium",
    perpendicularShift: "outer",
  },
  {
    name: "GND",
    marginName: "leftMargin",
    size: "Medium",
    perpendicularShift: "outer",
  },
  {
    name: "RESET",
    marginName: "leftMargin",
    size: "Medium",
    perpendicularShift: "inner",
  },
  {
    name: "TX",
    marginName: "topMargin",
    size: "Medium",
    perpendicularShift: "center",
  },
  {
    name: "RX",
    marginName: "topMargin",
    size: "Medium",
    perpendicularShift: "center",
  },
]

console.log("Contact Requests with Alignment:")
alignedContacts.forEach((c) => {
  console.log(
    `  ${c.name}: ${c.marginName} (${c.size}, ${c.perpendicularShift || "default"})`,
  )
})
console.log()

const alignedPositions = placeContactsInMargins(
  moleculeResult.margins,
  alignedContacts,
)

console.log("Calculated Positions:")
alignedPositions.forEach((pos) => {
  const contact = alignedContacts.find((c) => c.name === pos.name)
  console.log(
    `  ${pos.name}: (${pos.pcbX}, ${pos.pcbY}) - ${pos.marginName}[${pos.gridIndex}] (${contact?.perpendicularShift || "default"})`,
  )
})
console.log()

// Example 3: Per-margin perpendicularShift override
console.log("=".repeat(80))
console.log("EXAMPLE 3: Per-Margin Alignment Override")
console.log("=".repeat(80))
console.log()

const marginAlignedContacts: ContactRequest[] = [
  { name: "VCC", marginName: "leftMargin", size: "Medium" },
  { name: "GND", marginName: "leftMargin", size: "Medium" },
  { name: "TX", marginName: "topMargin", size: "Medium" },
  { name: "RX", marginName: "topMargin", size: "Medium" },
  { name: "EN", marginName: "topMargin", size: "Medium" },
  { name: "CLK", marginName: "rightMargin", size: "Medium" },
  { name: "DATA", marginName: "rightMargin", size: "Medium" },
]

console.log("Contact Requests:")
marginAlignedContacts.forEach((c) => {
  console.log(`  ${c.name}: ${c.marginName} (${c.size})`)
})
console.log()

console.log("Margin Alignments:")
console.log(`  leftMargin: outer`)
console.log(`  topMargin: center`)
console.log(`  rightMargin: inner`)
console.log()

const marginAlignedPositions = placeContactsInMargins(
  moleculeResult.margins,
  marginAlignedContacts,
  "center",
  {
    leftMargin: "outer",
    topMargin: "center",
    rightMargin: "inner",
  },
)

console.log("Calculated Positions:")
marginAlignedPositions.forEach((pos) => {
  console.log(
    `  ${pos.name}: (${pos.pcbX}, ${pos.pcbY}) - ${pos.marginName}[${pos.gridIndex}]`,
  )
})
console.log()

// Example 4: Mixed contact sizes (in different margins)
console.log("=".repeat(80))
console.log("EXAMPLE 4: Mixed Contact Sizes (Different Margins)")
console.log("=".repeat(80))
console.log()

const mixedSizeContacts: ContactRequest[] = [
  { name: "PWR", marginName: "leftMargin", size: "Large" },
  { name: "GND", marginName: "leftMargin", size: "Large" },
  { name: "TX", marginName: "topMargin", size: "Medium" },
  { name: "RX", marginName: "topMargin", size: "Medium" },
  { name: "CLK", marginName: "topMargin", size: "Medium" },
]

console.log("Contact Requests:")
mixedSizeContacts.forEach((c) => {
  console.log(`  ${c.name}: ${c.marginName} (${c.size})`)
})
console.log()

const mixedSizePositions = placeContactsInMargins(
  moleculeResult.margins,
  mixedSizeContacts,
)

console.log("Calculated Positions:")
mixedSizePositions.forEach((pos) => {
  const contact = mixedSizeContacts.find((c) => c.name === pos.name)
  console.log(
    `  ${pos.name}: (${pos.pcbX}, ${pos.pcbY}) - ${pos.marginName}[${pos.gridIndex}] (${contact?.size})`,
  )
})
console.log()

// Example 5: Error handling - capacity exceeded
console.log("=".repeat(80))
console.log("EXAMPLE 5: Error Handling - Capacity Exceeded")
console.log("=".repeat(80))
console.log()

const tooManyContacts: ContactRequest[] = [
  { name: "C1", marginName: "leftMargin", size: "Medium" },
  { name: "C2", marginName: "leftMargin", size: "Medium" },
  { name: "C3", marginName: "leftMargin", size: "Medium" },
  { name: "C4", marginName: "leftMargin", size: "Medium" },
  { name: "C5", marginName: "leftMargin", size: "Medium" },
  { name: "C6", marginName: "leftMargin", size: "Medium" },
  { name: "C7", marginName: "leftMargin", size: "Medium" },
  { name: "C8", marginName: "leftMargin", size: "Medium" },
  { name: "C9", marginName: "leftMargin", size: "Medium" },
  { name: "C10", marginName: "leftMargin", size: "Medium" },
  { name: "C11", marginName: "leftMargin", size: "Medium" },
  { name: "C12", marginName: "leftMargin", size: "Medium" },
  { name: "C13", marginName: "leftMargin", size: "Medium" },
  { name: "C14", marginName: "leftMargin", size: "Medium" }, // This exceeds capacity
]

console.log(
  `Attempting to place ${tooManyContacts.length} Medium contacts in leftMargin...`,
)
console.log()

try {
  placeContactsInMargins(moleculeResult.margins, tooManyContacts)
  console.log("❌ ERROR: Should have thrown capacity error!")
} catch (error) {
  console.log("✓ Caught expected error:")
  console.log(`  ${(error as Error).message}`)
}
console.log()

// Example 6: Error handling - mixed sizes in same margin
console.log("=".repeat(80))
console.log("EXAMPLE 6: Error Handling - Mixed Sizes in Same Margin")
console.log("=".repeat(80))
console.log()

const mixedSizeSameMargin: ContactRequest[] = [
  { name: "VCC", marginName: "leftMargin", size: "Medium" },
  { name: "GND", marginName: "leftMargin", size: "Large" }, // Different size!
]

console.log("Contact Requests:")
mixedSizeSameMargin.forEach((c) => {
  console.log(`  ${c.name}: ${c.marginName} (${c.size})`)
})
console.log()

try {
  placeContactsInMargins(moleculeResult.margins, mixedSizeSameMargin)
  console.log("❌ ERROR: Should have thrown mixed size error!")
} catch (error) {
  console.log("✓ Caught expected error:")
  console.log(`  ${(error as Error).message}`)
}
console.log()

console.log("=".repeat(80))
console.log("DEMONSTRATION COMPLETE")
console.log("=".repeat(80))
