// ===== MoleculeMarginContacts.tsx =====
// React components for declarative contact placement in molecule margins

import {
  MachineContactMedium,
  MachineContactLarge,
} from "@tsci/imrishabh18.library"

import React from "react"
import type { calculateMolecule } from "./MoleculeCalculator"

import {
  getAllMarginPositions,
  getPositionByIndex,
  ContactSize,
  ContactPerpendicularShift,
  calculateContactPositions,
  calculateContactPositionsForMargins,
} from "./MoleculeMarginPacker"

export interface MarginContactsProps {
  margin:
    | "leftMargin"
    | "topMargin"
    | "rightMargin"
    | "bottomMargin"
    | "centerMargin"
  contacts: string[] // Array of contact names like ["VCC", "GND", "TX"]
  size: ContactSize // "Medium" or "Large"
  perpendicularShift?: ContactPerpendicularShift // "outer" | "center" | "inner" (default: "center")
  component?: React.ComponentType<{ name: string; pcbX: number; pcbY: number }>
  moleculeResult?: ReturnType<typeof calculateMolecule> // Molecule data automatically injected by Molecule
}

export interface AutoPlaceContactsProps {
  contacts: {
    [marginName: string]: string[] // e.g., { leftMargin: ["VCC", "GND"], topMargin: ["TX", "RX"] }
  }
  size: ContactSize
  perpendicularShift?: ContactPerpendicularShift
  component?: React.ComponentType<{ name: string; pcbX: number; pcbY: number }>
  moleculeResult?: ReturnType<typeof calculateMolecule> // Molecule data automatically injected by Molecule
}

export interface FillMarginsProps {
  marginsToFill?: string[] // Optional: specific margins to fill (e.g., ["leftMargin", "rightMargin"]). If undefined, fills all margins.
  size: ContactSize
  perpendicularShift?: ContactPerpendicularShift
  prefix?: string // Optional: contact name prefix (default: "MC")
  component?: React.ComponentType<{ name: string; pcbX: number; pcbY: number }>
  moleculeResult?: ReturnType<typeof calculateMolecule> // Molecule data automatically injected by Molecule
}

/**
 * Automatically place contacts in a specific margin.
 * Contacts are positioned sequentially starting from index 0.
 *
 * @example
 * ```tsx
 * <MarginContacts
 *   margin="leftMargin"
 *   contacts={["VCC", "GND", "RESET"]}
 *   size="Medium"
 *   perpendicularShift="outer"
 * />
 * ```
 */
export const MarginContacts: React.FC<MarginContactsProps> = ({
  margin,
  contacts,
  size,
  perpendicularShift = "center",
  component: ContactComponent,
  moleculeResult,
}) => {
  if (!moleculeResult) {
    console.error(
      "MarginContacts requires moleculeResult prop (automatically injected by Molecule)",
    )
    return null
  }

  // Get all possible positions for this margin
  const grid = getAllMarginPositions(
    moleculeResult.margins,
    size,
    perpendicularShift,
  )

  // Get positions for this specific margin
  const marginPositions = grid.margins[margin]
  if (!marginPositions) {
    console.warn(`Margin "${margin}" not found in molecule`)
    return null
  }

  // Check capacity
  if (contacts.length > marginPositions.capacity) {
    console.error(
      `Too many contacts for ${margin}. ` +
        `Requested: ${contacts.length}, Capacity: ${marginPositions.capacity}`,
    )
    return null
  }

  // Determine which contact component to use
  let DefaultComponent: React.ComponentType<{
    name: string
    pcbX: number
    pcbY: number
  }>

  if (size === "Medium") {
    // Dynamically import MachineContactMedium
    DefaultComponent = (props: {
      name: string
      pcbX: number
      pcbY: number
    }) => (
      <MachineContactMedium
        //contactSize="Medium"
        name={props.name}
        pcbX={props.pcbX}
        pcbY={props.pcbY}
      />
    )
  } else {
    // Dynamically import MachineContactLarge
    DefaultComponent = (props: {
      name: string
      pcbX: number
      pcbY: number
    }) => (
      <MachineContactLarge
        //contactSize="Large"
        name={props.name}
        pcbX={props.pcbX}
        pcbY={props.pcbY}
      />
    )
  }

  const Component = ContactComponent || DefaultComponent

  // Render positioned contacts
  return (
    <>
      {contacts.map((contactName, index) => {
        const pos = getPositionByIndex(grid, margin, index)
        if (!pos) {
          console.warn(`Position ${index} not found for ${margin}`)
          return null
        }

        return (
          <Component
            key={contactName}
            name={contactName}
            pcbX={pos.pcbX}
            pcbY={pos.pcbY}
          />
        )
      })}
    </>
  )
}

/**
 * Automatically place contacts across multiple margins.
 * Processes margins in clockwise order: left → top → right → bottom.
 *
 * @example
 * ```tsx
 * <AutoPlaceContacts
 *   contacts={{
 *     leftMargin: ["VCC", "GND"],
 *     topMargin: ["TX", "RX", "CLK"],
 *     rightMargin: ["DATA"]
 *   }}
 *   size="Medium"
 *   perpendicularShift="center"
 * />
 * ```
 */
export const AutoPlaceContacts: React.FC<AutoPlaceContactsProps> = ({
  contacts,
  size,
  perpendicularShift = "center",
  component,
  moleculeResult,
}) => {
  if (!moleculeResult) {
    console.error(
      "AutoPlaceContacts requires moleculeResult prop (automatically injected by Molecule)",
    )
    return null
  }

  // Define margin processing order (clockwise)
  const marginOrder: Array<
    "leftMargin" | "topMargin" | "rightMargin" | "bottomMargin" | "centerMargin"
  > = ["leftMargin", "topMargin", "rightMargin", "bottomMargin", "centerMargin"]

  return (
    <>
      {marginOrder.map((marginName) => {
        const marginContacts = contacts[marginName]
        if (!marginContacts || marginContacts.length === 0) {
          return null
        }

        return (
          <MarginContacts
            key={marginName}
            margin={marginName}
            contacts={marginContacts}
            size={size}
            perpendicularShift={perpendicularShift}
            component={component}
            moleculeResult={moleculeResult}
          />
        )
      })}
    </>
  )
}

/**
 * Fill margins completely with auto-generated contacts.
 * Contacts are named sequentially (e.g., MC1, MC2, MC3...) in clockwise order.
 *
 * @example
 * Fill all margins:
 * ```tsx
 * <FillMargins size="Medium" />
 * ```
 *
 * @example
 * Fill only left and right margins:
 * ```tsx
 * <FillMargins
 *   marginsToFill={["leftMargin", "rightMargin"]}
 *   size="Medium"
 *   perpendicularShift="outer"
 * />
 * ```
 *
 * @example
 * Fill with custom prefix:
 * ```tsx
 * <FillMargins
 *   marginsToFill={["leftMargin"]}
 *   size="Large"
 *   prefix="PIN"  // Generates PIN1, PIN2, PIN3...
 * />
 * ```
 */
export const FillMargins: React.FC<FillMarginsProps> = ({
  marginsToFill,
  size,
  perpendicularShift = "center",
  prefix = "MC",
  component: ContactComponent,
  moleculeResult,
}) => {
  if (!moleculeResult) {
    console.error(
      "FillMargins requires moleculeResult prop (automatically injected by Molecule)",
    )
    return null
  }

  const contactBoundingBoxSize = size === "Medium" ? 2 : 6

  // Calculate all contact positions
  const contactPositions = marginsToFill
    ? calculateContactPositionsForMargins(
        moleculeResult.margins,
        contactBoundingBoxSize,
        marginsToFill,
        perpendicularShift,
      )
    : calculateContactPositions(
        moleculeResult.margins,
        contactBoundingBoxSize,
        perpendicularShift,
      )

  // Determine which contact component to use
  let DefaultComponent: React.ComponentType<{
    name: string
    pcbX: number
    pcbY: number
  }>

  if (size === "Medium") {
    DefaultComponent = (props: {
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
    DefaultComponent = (props: {
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

  const Component = ContactComponent || DefaultComponent

  // Render all contacts
  return (
    <>
      {contactPositions.map((pos) => {
        // Replace "MC" prefix with custom prefix if specified
        const contactName =
          prefix === "MC" ? pos.name : pos.name.replace(/^MC/, prefix)

        return (
          <Component
            key={pos.name}
            name={contactName}
            pcbX={pos.pcbX}
            pcbY={pos.pcbY}
          />
        )
      })}
    </>
  )
}
