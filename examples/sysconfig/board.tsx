export default () => (
  <board width="10mm" height="10mm">
    <chip
      name="U1"
      manufacturerPartNumber="CC2340R52E0RGER"
      pinLabels={{
        pin5: ["SIGNAL", "DIO12"],
        pin3: ["SDA", "DIO8"],
        pin19: ["SCL", "DIO6_A1"],
      }}
    />
  </board>
)
