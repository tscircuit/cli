import React from "react"
import { MoleculeProps } from "./MoleculeCalculator"

// Forward declaration - will be provided by MoleculeTemplate.tsx
let Molecule: any
let MoleculeReceiver: any

// Setter functions to avoid circular dependency
export const setMoleculeComponents = (molecule: any, moleculeReceiver: any) => {
  Molecule = molecule
  MoleculeReceiver = moleculeReceiver
}

// Option 1: ReceiverOf as HOC (Higher-Order Component)
// Usage: const ReceiverComp = ReceiverOf(SomeMolecule); <ReceiverComp {...props} />
export const ReceiverOf = (MoleculeComponent: any) => {
  return (props: any) => {
    // Render the molecule component and capture its React element tree
    const moleculeElement = MoleculeComponent(props)

    // Find the innermost Molecule component and its props
    const extractMoleculeProps = (element: any): MoleculeProps | null => {
      if (!element || !React.isValidElement(element)) return null

      // Check if this element is a Molecule wrapper (like Molecule4x2MedShort)
      // It should have children that eventually contain a <Molecule> component
      if (element.type === Molecule) {
        return element.props as MoleculeProps
      }

      // Recursively search in children
      const elementProps = element.props as any
      if (elementProps && elementProps.children) {
        const children = React.Children.toArray(elementProps.children)
        for (const child of children) {
          const found = extractMoleculeProps(child)
          if (found) return found
        }
      }

      // If element has a render function or is a component, try rendering it
      if (typeof element.type === "function") {
        try {
          // Handle both function components and class components
          const isClassComponent =
            element.type.prototype && element.type.prototype.isReactComponent
          if (!isClassComponent) {
            const rendered = (element.type as Function)(elementProps)
            return extractMoleculeProps(rendered)
          }
        } catch (e) {
          // Can't render, continue searching
        }
      }

      return null
    }

    const moleculeProps = extractMoleculeProps(moleculeElement)

    if (!moleculeProps) {
      console.error(
        "ReceiverOf: Could not find Molecule component in the provided component tree",
      )
      return moleculeElement // Return original if we can't convert
    }

    // Extract children from the original molecule
    // These will be things like PackContacts components
    const extractChildren = (element: any): any => {
      if (!element || !React.isValidElement(element)) return null

      if (element.type === Molecule) {
        return (element.props as any).children
      }

      const elementProps = element.props as any
      if (elementProps && elementProps.children) {
        const children = React.Children.toArray(elementProps.children)
        for (const child of children) {
          const found = extractChildren(child)
          if (found) return found
        }
      }

      if (typeof element.type === "function") {
        try {
          const isClassComponent =
            element.type.prototype && element.type.prototype.isReactComponent
          if (!isClassComponent) {
            const rendered = (element.type as Function)(elementProps)
            return extractChildren(rendered)
          }
        } catch (e) {
          // Can't render
        }
      }

      return null
    }

    const originalChildren = extractChildren(moleculeElement)
    // console.log("ReceiverOf: Extracted children:", originalChildren);

    // Build a new MoleculeReceiver from scratch using only the layout props we need
    // Pass the extracted children (like PackContacts) - they will receive moleculeResult automatically
    return (
      <MoleculeReceiver
        type={moleculeProps.type}
        size={moleculeProps.size}
        pinType={moleculeProps.pinType}
        wing={moleculeProps.wing}
        roundEdges={moleculeProps.roundEdges}
        pcbX={moleculeProps.pcbX}
        pcbY={moleculeProps.pcbY}
        debug={moleculeProps.debug}
      >
        {originalChildren}
      </MoleculeReceiver>
    )
  }
}

// Option 2: ReceiverOf as wrapper component
// Usage: <ReceiverOf molecule={SomeMolecule} {...props} />
export const ReceiverOfWrapper = ({
  molecule: MoleculeComponent,
  ...props
}: { molecule: any; [key: string]: any }) => {
  const ReceiverComponent = ReceiverOf(MoleculeComponent)
  return <ReceiverComponent {...props} />
}
