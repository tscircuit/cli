/**
 * RC Low-Pass Filter Circuit
 * 
 * This circuit demonstrates a classic RC low-pass filter with:
 * - AC voltage source (1V, 1kHz square wave)
 * - 1kΩ resistor
 * - 100nF capacitor
 * 
 * Perfect for visualizing:
 * - Input voltage step response
 * - Capacitor charging/discharging behavior
 * - Filtered output voltage
 * - Time-domain simulation results
 * 
 * Usage:
 *   bun cli/main.ts simulate visualize examples/rc-filter/index.circuit.tsx
 *   bun cli/main.ts simulate visualize examples/rc-filter/index.circuit.tsx -o filter-sim.svg
 */

export default () => (
  <board width={40} height={30}>
    {/* AC Voltage Source - 1V, 1kHz square wave */}
    <voltagesource
      name="V_in"
      voltage="1V"
      waveShape="square"
      frequency="1kHz"
      dutyCycle={0.5}
      schX={-10}
      schY={0}
      schRotation={270}
    />

    {/* Series Resistor - 1kΩ */}
    <resistor
      name="R1"
      resistance="1k"
      footprint="0603"
      schX={0}
      schY={0}
    />

    {/* Shunt Capacitor - 100nF (creates low-pass filter) */}
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0603"
      schX={8}
      schY={0}
      schRotation={270}
    />

    {/* Load Resistor - 10kΩ (optional, to show loading effects) */}
    <resistor
      name="R_load"
      resistance="10k"
      footprint="0603"
      schX={8}
      schY={-6}
      schRotation={270}
    />

    {/* Traces - wiring connections */}
    
    {/* V_in pin 1 to R1 pin 1 */}
    <trace from=".V_in > .pin1" to=".R1 > .pin1" />

    {/* R1 pin 2 to C1 pin 1 and R_load pin 1 */}
    <trace from=".R1 > .pin2" to=".C1 > .pin1" />
    <trace from=".R1 > .pin2" to=".R_load > .pin1" />

    {/* C1 pin 2 and R_load pin 2 to GND */}
    <trace from=".C1 > .pin2" to="net.GND" />
    <trace from=".R_load > .pin2" to="net.GND" />

    {/* V_in pin 2 to GND */}
    <trace from=".V_in > .pin2" to="net.GND" />
  </board>
)
