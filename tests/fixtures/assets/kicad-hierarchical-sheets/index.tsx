export default () => (
  <board width="20mm" height="10mm">
    <schematicsheet name="power" displayName="Power and USB" sheetIndex={0} />
    <schematicsheet
      name="control"
      displayName="Controller and Controls"
      sheetIndex={1}
    />
    <resistor name="R1" resistance="1k" footprint="0402" schSheetName="power" />
    <capacitor
      name="C1"
      capacitance="1uF"
      footprint="0402"
      schSheetName="control"
    />
  </board>
)
