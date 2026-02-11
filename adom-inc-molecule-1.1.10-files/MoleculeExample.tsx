import { Molecule, PackContacts } from "lib/MoleculeTemplate"
import type { MoleculeTemplateProps } from "lib/src/MoleculeBuilder"

export default function Molecule8x8MedShort(props: MoleculeTemplateProps = {}) {
  const { wing, wingTop, wingBottom, wingLeft, wingRight, children } = props

  return (
    <Molecule
      type="4pin"
      size="8x8"
      pinType="MachinePinMediumShort"
      roundEdges={true}
      wing={wing ?? "nominal"}
      debug={true}
    >
      <PackContacts
        topMargin={["1"]}
        bottomMargin={["1", { gap: 2 }, "2"]}
        leftMargin={["*FILL*"]}
        rightMargin={["*FILL*"]}
      />
      <silkscreentext //silkscreentext
        pcbX={0}
        pcbY={1}
        anchorAlignment="center"
        fontSize={1}
        text={"ADOM"}
      />
      <silkscreentext //silkscreentext
        pcbX={0}
        pcbY={0}
        anchorAlignment="center"
        fontSize={1}
        text={"MOLECULE"}
      />
      <silkscreentext //silkscreentext
        pcbX={0}
        pcbY={-1}
        anchorAlignment="center"
        fontSize={1}
        text={"EXAMPLE"}
      />
      {children}
    </Molecule>
  )
}
