# CLAUDE.md

This file provides guidance when working with code in this tscircuit project.

## Common Commands

- `bun run dev` or `tsci dev` - Start development server with live preview
- `bun run build` or `tsci build` - Build circuit JSON and validate
- `bun run snapshot` or `tsci snapshot` - Run snapshot tests
- `bun run snapshot:update` or `tsci snapshot --update` - Update snapshots
- `tsci push` - Push package to tscircuit registry

## Project Structure

- `index.tsx` - Main circuit component
- `tscircuit.config.json` - Project configuration with `$schema` for autocomplete
- `.npmrc` - NPM registry configuration for @tsci packages

## Essential Elements

### Board Container
```tsx
<board width="50mm" height="30mm">
  {/* components go here */}
</board>
```

### Common Components
- `<resistor />` - Resistor with `resistance` prop (e.g., `"1k"`, `"10kohm"`)
- `<capacitor />` - Capacitor with `capacitance` prop (e.g., `"100nF"`, `"10uF"`)
- `<inductor />` - Inductor with `inductance` prop (e.g., `"10uH"`)
- `<led />` - LED with `color` prop
- `<diode />` - Standard diode
- `<chip />` - Generic IC component (most flexible)
- `<pinheader />` - Pin header connector
- `<trace />` - Electrical connection between components

### Chip Configuration
```tsx
<chip
  name="U1"
  footprint="soic8"
  pinLabels={{
    pin1: "VCC",
    pin2: "OUT",
    // ...
  }}
  schPinArrangement={{
    leftSide: { direction: "top-to-bottom", pins: ["VCC", "IN"] },
    rightSide: { direction: "bottom-to-top", pins: ["GND", "OUT"] },
  }}
  connections={{
    VCC: "net.VCC",
    GND: "net.GND",
  }}
/>
```

## Footprints

### Common Footprint Strings
- SMD Passives: `"0402"`, `"0603"`, `"0805"`, `"1206"`
- IC Packages: `"soic8"`, `"qfp32"`, `"qfn24"`, `"dip8"`
- Connectors: `"pinrow4"`, `"pinrow8"`
- Through-hole: `"axial_p5mm"`

### KiCad Footprints
Use `kicad:` prefix: `footprint="kicad:Resistor_SMD/R_0402_1005Metric"`

## Positioning

- `schX`, `schY` - Schematic position (mm)
- `pcbX`, `pcbY` - PCB position (mm)
- `schRotation`, `pcbRotation` - Rotation in degrees
- `layer` - PCB layer (`"top"` or `"bottom"`)

## Traces and Connections

### Using Traces
```tsx
<trace from=".R1 > .pin1" to=".C1 > .pin1" />
<trace from=".U1 > .VCC" to="net.VCC" />
```

### Using Connections Prop
```tsx
<resistor
  name="R1"
  resistance="10k"
  footprint="0402"
  connections={{
    pin1: "net.VCC",
    pin2: ".U1 > .pin2",
  }}
/>
```

### Using sel for Type-safe Selectors
```tsx
import { sel } from "tscircuit"

<trace from={sel.R1.pin1} to={sel.C1.pin1} />
```

## Nets

Use `net.NAME` for power and signal nets:
- `net.VCC`, `net.GND` - Power nets
- `net.SDA`, `net.SCL` - Signal nets

## Groups

```tsx
<group pcbX={5} pcbY={3}>
  <resistor name="R1" resistance="1k" footprint="0402" />
  <resistor name="R2" resistance="1k" footprint="0402" pcbY={2} />
</group>
```

## Units

Default units are millimeters. Use strings for explicit units:
- Length: `"10mm"`, `"0.5in"`
- Resistance: `"1k"`, `"4.7kohm"`, `"1M"`
- Capacitance: `"100nF"`, `"10uF"`, `"1pF"`
- Inductance: `"10uH"`, `"100nH"`

## Before You're Done

- Run `bun run build` to verify the circuit compiles
- Run `bun run snapshot` to check visual output
