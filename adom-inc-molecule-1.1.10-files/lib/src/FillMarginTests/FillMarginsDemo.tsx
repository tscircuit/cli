import { Molecule } from "lib/MoleculeTemplate"
import { FillMargins } from "lib/src/MoleculeMarginContacts"

// ===== Basic Filling (Examples 1-4) =====
// Demonstrates basic margin filling patterns with different margin selections

// Example 1: Fill all margins completely with Medium contacts
// Generates MC1, MC2, MC3... in clockwise order (left → top → right → bottom)
export function Example1_FillAllMargins() {
  return (
    <Molecule
      type="4pin"
      size="16x16"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins size="Medium" />
    </Molecule>
  )
}

// Example 2: Fill only left and right margins
// Useful for vertical connectors or edge-mounted components
export function Example2_FillLeftRight() {
  return (
    <Molecule
      type="4pin"
      size="16x16"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        marginsToFill={["leftMargin", "rightMargin"]}
        size="Medium"
      />
    </Molecule>
  )
}

// Example 3: Fill only top and bottom margins
// Useful for horizontal connectors or inline components
export function Example3_FillTopBottom() {
  return (
    <Molecule
      type="4pin"
      size="16x16"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        marginsToFill={["topMargin", "bottomMargin"]}
        size="Medium"
      />
    </Molecule>
  )
}

// Example 4: Fill only one margin (left)
// Useful for single-edge connectors
export function Example4_FillLeftOnly() {
  return (
    <Molecule
      type="4pin"
      size="16x16"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins marginsToFill={["leftMargin"]} size="Medium" />
    </Molecule>
  )
}

// ===== Alignment Options (Examples 5-7) =====
// Demonstrates perpendicularShift alignment (only works with Medium contacts on Large pins)

// Example 5: Fill all margins on Large pin molecule with Medium contacts
// Demonstrates perpendicularShift alignment options
export function Example5_FillAllWithAlignment() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard" // Large pins required for perpendicularShift
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        size="Medium"
        perpendicularShift="outer" // Align contacts toward board edge
      />
    </Molecule>
  )
}

// Example 6: Fill specific margins with outer alignment
// Medium contacts on Large pins with outer perpendicularShift
export function Example6_FillLeftRightOuter() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        marginsToFill={["leftMargin", "rightMargin"]}
        size="Medium"
        perpendicularShift="outer"
      />
    </Molecule>
  )
}

// Example 7: Fill with inner alignment
// Medium contacts on Large pins aligned toward board center
export function Example7_FillAllInner() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        size="Medium"
        perpendicularShift="inner" // Align contacts toward board center
      />
    </Molecule>
  )
}

// ===== Contact Sizes (Examples 8-9) =====
// Demonstrates filling with different contact sizes

// Example 8: Fill with Large contacts on Large pins
// Note: Large contacts must use center perpendicularShift
export function Example8_FillAllLargeContacts() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        size="Large"
        perpendicularShift="center" // Large contacts must use center
      />
    </Molecule>
  )
}

// Example 9: Fill 64x64 Large pin molecule completely
// Maximum contact density on large molecule
export function Example9_Fill64x64() {
  return (
    <Molecule
      type="4pin"
      size="64x64"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins size="Medium" perpendicularShift="center" />
    </Molecule>
  )
}

// ===== Custom Prefixes (Examples 10-11) =====
// Demonstrates using custom contact name prefixes instead of default "MC"

// Example 10: Fill with custom prefix
// Instead of MC1, MC2, MC3... generates PIN1, PIN2, PIN3...
export function Example10_CustomPrefix() {
  return (
    <Molecule
      type="4pin"
      size="16x16"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        size="Medium"
        prefix="PIN" // Generates PIN1, PIN2, PIN3...
      />
    </Molecule>
  )
}

// Example 11: Fill with custom prefix on specific margins
// Generates GP1, GP2, GP3... only on left and right
export function Example11_CustomPrefixSpecificMargins() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        marginsToFill={["leftMargin", "rightMargin"]}
        size="Medium"
        prefix="GP" // Generates GP1, GP2, GP3...
      />
    </Molecule>
  )
}

// ===== Special Cases (Examples 12-15) =====
// Demonstrates advanced patterns and special use cases

// Example 12: Fill 2-pin molecule center margin
// Demonstrates filling a 2-pin molecule's center margin
export function Example12_Fill2Pin() {
  return (
    <Molecule
      type="2pin"
      size="6x2 absolute"
      pinType="MachinePinMediumShort"
      wing="nominal"
    >
      <FillMargins
        size="Medium"
        prefix="SIG" // Generates SIG1, SIG2...
      />
    </Molecule>
  )
}

// Example 13: Comparison - 8x8 molecule filled different ways
// Shows three different margin selection patterns side by side
export function Example13_ComparisonSmall() {
  return (
    <Molecule
      type="4pin"
      size="8x8"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        marginsToFill={["leftMargin", "topMargin", "rightMargin"]}
        size="Medium"
      />
    </Molecule>
  )
}

// Example 14: Breakout board pattern - all margins filled
// Maximum connectivity for prototyping/testing
export function Example14_BreakoutBoard() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        size="Medium"
        prefix="IO" // IO1, IO2, IO3...
      />
    </Molecule>
  )
}

// Example 15: Three margins filled (no bottom)
// Useful for components with bottom clearance requirements
export function Example15_ThreeSides() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <FillMargins
        marginsToFill={["leftMargin", "topMargin", "rightMargin"]}
        size="Medium"
        perpendicularShift="outer"
      />
    </Molecule>
  )
}

// Export default for quick testing - uncomment the one you want to view
// export default Example1_FillAllMargins;
// export default Example2_FillLeftRight;
// export default Example3_FillTopBottom;
// export default Example4_FillLeftOnly;
// export default Example5_FillAllWithAlignment;
// export default Example6_FillLeftRightOuter;
// export default Example7_FillAllInner;
// export default Example8_FillAllLargeContacts;
// export default Example9_Fill64x64;
// export default Example10_CustomPrefix;
// export default Example11_CustomPrefixSpecificMargins;
// export default Example12_Fill2Pin;
// export default Example13_ComparisonSmall;
// export default Example14_BreakoutBoard;
export default Example15_ThreeSides
