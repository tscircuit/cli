export const systemDiagramCode = `
import { systemblock } from "tscircuit"
export default () => <group pcbDisabled schematicDisabled>
  <systemblock.page name="Overview">
    <systemblock.component name="controller" displayName="Main controller" />
    <systemblock.component name="sensor" displayName="Temperature sensor" />
    <systemblock.connection from="controller" to="sensor" label="I2C" direction="both" />
  </systemblock.page>
  <systemblock.page name="Detail">
    <systemblock.component name="radio" displayName="Radio module" />
  </systemblock.page>
</group>
`

export const assemblySvgCode = `
export default () => <board width="10mm" height="10mm">
  <resistor name="R1" resistance="1k" footprint="0402" />
</board>
`
