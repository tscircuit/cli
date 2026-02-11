export {
  Molecule,
  MoleculeReceiver,
  ReceiverOf,
  ReceiverOfWrapper,
  PackContacts,
} from "./MoleculeTemplate"

export { calculateMolecule, parseSize } from "./src/MoleculeCalculator"
export type {
  MoleculeProps,
  MoleculeSizeString,
  WingSizeString,
  OptionalBoardProps,
  MoleculeTemplateProps,
  SizeParameter,
} from "./src/MoleculeCalculator"

//export { Molecule8x8MedStandard } from "./molecule-templates"
export * from "./molecule-templates"

// export * from "adom-library"
