import manualEdits from "./manual-edits.json"

export default () => (
  <board width="10mm" height="10mm" manualEdits={manualEdits}>
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={-3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
