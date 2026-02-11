import { MoleculeTemplatesToGenerate } from "../MoleculeTemplatesToGenerate"

export type ContactAlignment = "outer" | "center" | "inner"

type PackingTestConfig = {
  moleculeTemplate: (typeof MoleculeTemplatesToGenerate)[number]
  contactType: "Medium" | "Large"
  alignment?: ContactAlignment // How to align contacts within margins (default: "center")
  marginsToFill?: string[] // Optional: specific margins to fill (e.g., ["leftMargin", "rightMargin"]). If undefined, fills all margins.
  testFileName: string
}

// Define which packing tests to generate
// For Medium pin molecules: only test with Medium contacts
// For Large pin molecules: test with both Medium and Large contacts
export const MarginPackerTestsToGenerate: PackingTestConfig[] = [
  // 2-pin molecules
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule6x2MedShort",
    )!,
    contactType: "Medium",
    testFileName: "Molecule6x2MedShort_MediumContacts",
  },

  // 4-pin Medium molecules (keep one representative from each size)
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule8x8MedStandard",
    )!,
    contactType: "Medium",
    testFileName: "Molecule8x8Med_MediumContacts",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule16x16MedStandard",
    )!,
    contactType: "Medium",
    testFileName: "Molecule16x16Med_MediumContacts",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32MedStandard",
    )!,
    contactType: "Medium",
    testFileName: "Molecule32x32Med_MediumContacts",
  },

  // Selective margin filling examples - Left and Right only
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule8x8MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["leftMargin", "rightMargin"],
    testFileName: "Molecule8x8Med_LeftRight",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule16x16MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["leftMargin", "rightMargin"],
    testFileName: "Molecule16x16Med_LeftRight",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["leftMargin", "rightMargin"],
    testFileName: "Molecule32x32Med_LeftRight",
  },

  // Selective margin filling examples - Top and Bottom only
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule8x8MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["topMargin", "bottomMargin"],
    testFileName: "Molecule8x8Med_TopBottom",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule16x16MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["topMargin", "bottomMargin"],
    testFileName: "Molecule16x16Med_TopBottom",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["topMargin", "bottomMargin"],
    testFileName: "Molecule32x32Med_TopBottom",
  },

  // Selective margin filling examples - Left only
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule8x8MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["leftMargin"],
    testFileName: "Molecule8x8Med_LeftOnly",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule16x16MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["leftMargin"],
    testFileName: "Molecule16x16Med_LeftOnly",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32MedStandard",
    )!,
    contactType: "Medium",
    marginsToFill: ["leftMargin"],
    testFileName: "Molecule32x32Med_LeftOnly",
  },

  // 4-pin Large molecules - test with both Medium and Large contacts
  // Alignment test cases using Medium contacts on Large molecule
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32LargeStandard",
    )!,
    contactType: "Medium",
    alignment: "center",
    testFileName: "Molecule32x32Large_MediumContacts_Center",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32LargeStandard",
    )!,
    contactType: "Medium",
    alignment: "outer",
    testFileName: "Molecule32x32Large_MediumContacts_Outer",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32LargeStandard",
    )!,
    contactType: "Medium",
    alignment: "inner",
    testFileName: "Molecule32x32Large_MediumContacts_Inner",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule32x32LargeStandard",
    )!,
    contactType: "Large",
    testFileName: "Molecule32x32Large_LargeContacts",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule64x64LargeStandard",
    )!,
    contactType: "Medium",
    testFileName: "Molecule64x64Large_MediumContacts",
  },
  {
    moleculeTemplate: MoleculeTemplatesToGenerate.find(
      (t) => t.fileName === "Molecule64x64LargeStandard",
    )!,
    contactType: "Large",
    testFileName: "Molecule64x64Large_LargeContacts",
  },
]
