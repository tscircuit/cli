import soicUrl from "./soic8.glb"

export default () => {
  return (
    <board width="12mm" height="30mm">
      <chip
        name="H1"
        pcbX={0}
        pcbY={0}
        cadModel={<cadmodel modelUrl={soicUrl} />}
        footprint={
          <footprint>
            <hole diameter="0.8mm" pcbX={0} pcbY={0} />
          </footprint>
        }
      />
    </board>
  )
}
