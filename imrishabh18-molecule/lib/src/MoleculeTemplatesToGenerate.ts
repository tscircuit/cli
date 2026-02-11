import type { MoleculeProps, MoleculeSizeString } from "lib/src/MoleculeBuilder"

/*
type MoleculeTemplate = {
    name: string;
    definition: string;
};

const MoleculeTemplatesToGenerate: MoleculeTemplate[] = [
    {
        name: "Molecule4x2MedShort",
        definition: ' <Molecule type="2pin" size="6x2 absolute" pinType="MachinePinMediumShort" wing="0" /> ',
    }
]
*/

type MoleculeTemplate = {
  fileName: string
} & Omit<MoleculeProps, "children">

export const MoleculeTemplatesToGenerate: MoleculeTemplate[] = [
  {
    fileName: "Molecule4x2MedShort",
    type: "2pin",
    size: "4x2 absolute",
    pinType: "MachinePinMediumShort",
    wing: "0",
    //roundEdges:false,
  },
  {
    fileName: "Molecule6x2MedShort",
    type: "2pin",
    size: "6x2 absolute",
    pinType: "MachinePinMediumShort",
    wing: "0",
    //roundEdges:false,
  },
  {
    fileName: "Molecule8x8MedShort",
    type: "4pin",
    size: "8x8",
    pinType: "MachinePinMediumShort",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule8x8MedStandard",
    type: "4pin",
    size: "8x8",
    pinType: "MachinePinMediumStandard",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule16x8MedStandard",
    type: "4pin",
    size: "16x8",
    pinType: "MachinePinMediumStandard",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule16x16MedStandard",
    type: "4pin",
    size: "16x16",
    pinType: "MachinePinMediumStandard",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule32x32MedStandard",
    type: "4pin",
    size: "32x32",
    pinType: "MachinePinMediumStandard",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule32x32LargeStandard",
    type: "4pin",
    size: "32x32",
    pinType: "MachinePinLargeStandard",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule64x32LargeStandard",
    type: "4pin",
    size: "64x32",
    pinType: "MachinePinLargeStandard",
    wing: "nominal",
    roundEdges: true,
  },
  {
    fileName: "Molecule64x64LargeStandard",
    type: "4pin",
    size: "64x64",
    pinType: "MachinePinLargeStandard",
    wing: "nominal",
    roundEdges: true,
  },
]
