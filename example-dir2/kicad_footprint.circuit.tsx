import kicadMod from "./footprint.kicad_mod"

export default () => {
  return (
    <board>
      <chip footprint={kicadMod} name="U2" />
    </board>
  )
}
