export const carrierDrawingCode = `
import { assembly, jscad } from "tscircuit"

const MountingBracket = () => (
  <jscad.subtract>
    <jscad.union>
      <jscad.cuboid size={[56, 38, 4]} center={[0, 0, 2]} />
      <jscad.cuboid size={[56, 6, 26]} center={[0, -16, 15]} />
    </jscad.union>
    {[-22, 22].flatMap((x) => [-8, 12].map((y) => (
      <jscad.cylinder key={x + "," + y} radius={1.8} height={8} center={[x, y, 2]} />
    )))}
    <jscad.cuboid size={[24, 10, 10]} center={[0, -16, 17]} />
    {[-20, 20].map((x) => (
      <jscad.translate key={x} offset={[x, -16, 17]}>
        <jscad.rotate angles={[Math.PI / 2, 0, 0]}>
          <jscad.cylinder radius={2} height={10} />
        </jscad.rotate>
      </jscad.translate>
    ))}
  </jscad.subtract>
)

export default () => (
  <assembly.device>
    <assembly.printedpart name="carrier" material="petg" jscad={<MountingBracket />} />
    <assembly.drawing.page name="carrier-plan" size="iso_a4">
      <assembly.drawing.titleblock
        title="CONTROLLER MOUNTING BRACKET"
        identificationNumber="CTRL-001"
        revisionIndex="A"
        creator="tscircuit"
        legalOwner="tscircuit"
        approvalPerson="PRELIMINARY"
        sheetNumber={1}
        numberOfSheets={1}
      />
      <assembly.drawing.partview
        partRef=".carrier"
        name="top"
        displayName="TOP VIEW"
        direction="z+"
        width={90}
        height={65}
        centerX={-80}
        centerY={50}
      >
        <assembly.drawing.dimension widthOfView />
        <assembly.drawing.dimension heightOfView />
      </assembly.drawing.partview>
      <assembly.drawing.partview
        partRef=".carrier"
        name="front"
        displayName="FRONT ELEVATION"
        direction="y+"
        width={90}
        height={60}
        centerX={-80}
        centerY={-30}
      >
        <assembly.drawing.dimension heightOfView />
      </assembly.drawing.partview>
      <assembly.drawing.partview
        partRef=".carrier"
        name="isometric"
        displayName="ISOMETRIC"
        direction="isometric"
        width={130}
        height={115}
        centerX={55}
        centerY={20}
      />
    </assembly.drawing.page>
  </assembly.device>
)
`
