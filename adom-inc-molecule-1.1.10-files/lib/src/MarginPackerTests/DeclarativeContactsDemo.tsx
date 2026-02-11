// ===== DeclarativeContactsDemo.tsx =====
// Example showing declarative contact placement using arrays
// import {MachinePin} from "@adom-footprint-library/src/MachinePin"
// import {MachineContact} from "@adom-footprint-library/src/MachineContact"
import { Molecule } from "lib/MoleculeTemplate"
import { MarginContacts, AutoPlaceContacts } from "../MoleculeMarginContacts"

// Example 1: Using MarginContacts for individual margins
export function Example1_IndividualMargins() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      {/* Left margin: Power contacts with outer perpendicularShift */}
      <MarginContacts
        margin="leftMargin"
        contacts={["VCC", "GND", "RESET"]}
        size="Medium"
        perpendicularShift="outer"
      />

      {/* Top margin: Communication contacts */}
      <MarginContacts
        margin="topMargin"
        contacts={["TX", "RX", "CLK"]}
        size="Medium"
        perpendicularShift="center"
      />

      {/* Right margin: Data contact with inner perpendicularShift */}
      <MarginContacts
        margin="rightMargin"
        contacts={["DATA"]}
        size="Medium"
        perpendicularShift="inner"
      />
    </Molecule>
  )
}

// Example 2: Using AutoPlaceContacts for multiple margins at once
export function Example2_AutoPlace() {
  const contactsByMargin = {
    leftMargin: ["VCC", "GND"],
    topMargin: ["TX", "RX", "CLK", "EN"],
    rightMargin: ["DATA", "BUSY"],
    bottomMargin: ["CS", "MOSI", "MISO"],
  }

  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <AutoPlaceContacts
        contacts={contactsByMargin}
        size="Medium"
        perpendicularShift="center"
      />
    </Molecule>
  )
}

// Example 3: Small 8x8 molecule
export function Example3_Small8x8() {
  return (
    <Molecule
      type="4pin"
      size="8x8"
      pinType="MachinePinMediumStandard"
      wing="nominal"
      roundEdges={true}
    >
      <AutoPlaceContacts
        contacts={{
          leftMargin: ["VCC", "GND"],
          topMargin: ["TX", "RX"],
        }}
        size="Medium"
      />
    </Molecule>
  )
}

// Example 4: Large contacts
export function Example4_LargeContacts() {
  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <MarginContacts
        margin="leftMargin"
        contacts={["PWR", "GND"]}
        size="Large"
      />

      <MarginContacts
        margin="topMargin"
        contacts={["TX", "RX"]}
        size="Medium"
      />
    </Molecule>
  )
}

// Example 5: Programmatically building contact arrays
export function Example5_ProgrammaticArrays() {
  // Build arrays programmatically
  const powerPins = ["VCC", "GND"]
  const dataPins = Array.from({ length: 4 }, (_, i) => `D${i}`)
  const controlPins = ["CS", "WR", "RD"]

  return (
    <Molecule
      type="4pin"
      size="32x32"
      pinType="MachinePinLargeStandard"
      wing="nominal"
      roundEdges={true}
    >
      <MarginContacts margin="leftMargin" contacts={powerPins} size="Medium" />
      <MarginContacts margin="topMargin" contacts={dataPins} size="Medium" />
      <MarginContacts
        margin="rightMargin"
        contacts={controlPins}
        size="Medium"
      />
    </Molecule>
  )
}

/*
 * USAGE PATTERNS:
 *
 * 1. Simple array definition:
 *    <MarginContacts margin="leftMargin" contacts={["VCC", "GND"]} size="Medium" />
 *
 * 2. Object with all margins:
 *    const contacts = {
 *      leftMargin: ["VCC", "GND"],
 *      topMargin: ["TX", "RX"]
 *    };
 *    <AutoPlaceContacts contacts={contacts} size="Medium" />
 *
 * 3. Programmatic arrays:
 *    const pins = Array.from({length: 8}, (_, i) => `D${i}`);
 *    <MarginContacts margin="topMargin" contacts={pins} size="Medium" />
 *
 * 4. Per-margin perpendicularShift:
 *    <MarginContacts
 *      margin="leftMargin"
 *      contacts={["VCC", "GND"]}
 *      size="Medium"
 *      perpendicularShift="outer"
 *    />
 *
 * BENEFITS:
 * - No manual position calculations
 * - Declarative and readable
 * - Easy to modify contact lists
 * - Automatic sequential positioning
 * - Type-safe with TypeScript
 * - Margins automatically injected as props from Molecule
 */
