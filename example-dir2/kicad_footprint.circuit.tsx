// @ts-ignore
import kicadMod from "./footprint.kicad_mod"

export default () => {
  return (
    <board>
      {/* DOESNT WORKS, BOTH SENDS SAME RESULT kicadMod=="/api/files/static/footprint.kicad_mod" */}
      {/* <chip footprint={"/api/files/static/footprint.kicad_mod"} name="U2" /> */}
      <chip footprint={kicadMod} name="U1" />

      {/* WORKS WITH EXPLICIT URL  */}
      {/* <chip footprint={"http://localhost:3020/api/files/static/footprint.kicad_mod"} name="U3" /> */}
    </board>
  )
}
