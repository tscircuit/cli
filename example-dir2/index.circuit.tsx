import myObjUrl from "./myObj.obj"
import myObjUrl2 from "./myObj2.obj"

export default () => {
  return (
    <board width="12mm" height="30mm">
      <resistor
        name="R1"
        footprint="0603"
        resistance="1k"
        pcbY={7}
        cadModel={{ objUrl: myObjUrl }}
      />
      <chip
        name="H1"
        pcbX={0}
        pcbY={0}
        cadModel={{
          objUrl: myObjUrl2,
          rotationOffset: { x: 90, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0.6 },
        }}
        footprint={
          <footprint>
            <hole diameter="0.8mm" pcbX={0} pcbY={0} />
          </footprint>
        }
      />
    </board>
  )
}
