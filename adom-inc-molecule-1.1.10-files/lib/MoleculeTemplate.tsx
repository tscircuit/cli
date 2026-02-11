import { MoleculeBuilder, MoleculeProps } from "./src/MoleculeBuilder"
import { MoleculeReceiverBuilder } from "./src/MoleculeReceiverBuilder"
import {
  ReceiverOf as ReceiverOfHOC,
  ReceiverOfWrapper as ReceiverOfWrapperComponent,
  setMoleculeComponents,
} from "./src/ReceiverOf"

export { PackContacts } from "lib/src/PackContacts"

export const Molecule = (props: MoleculeProps) => {
  return <MoleculeBuilder {...props} />
}

export const MoleculeReceiver = (props: MoleculeProps) => {
  return <MoleculeReceiverBuilder {...props} />
}

// Initialize the ReceiverOf module with the Molecule components to avoid circular dependency
setMoleculeComponents(Molecule, MoleculeReceiver)

// Re-export ReceiverOf functionality
export const ReceiverOf = ReceiverOfHOC
export const ReceiverOfWrapper = ReceiverOfWrapperComponent
