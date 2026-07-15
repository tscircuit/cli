import kicadMod from "./footprint.kicad_mod"
import kicadSymbol from "./symbol.kicad_sym"

export default () => {
  return (
    <board>
      <chip footprint={kicadMod} name="U1" symbol={kicadSymbol} />
    </board>
  )
}
