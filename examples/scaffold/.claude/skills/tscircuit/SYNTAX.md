# tscircuit syntax primer

## 1) Root element

A circuit is typically a default export that returns a `<board />` or a form-factor board component from `@tscircuit/common`.

Example:

```tsx
import React from "react"

export default () => (
  <board width="10mm" height="10mm">
    <resistor name="R1" resistance="1k" footprint="0402" />
  </board>
)
```

## 2) Layout properties

You can place nearly any element with:
- `pcbX`, `pcbY` (PCB position)
- `pcbRotation`
- `layer` (e.g., `"bottom"`)

For schematics:
- `schX`, `schY`
- `schRotation`
- `schOrientation`

Units
- Numbers are interpreted as mm.
- Strings can include units (e.g., `"0.1in"`, `"2.54mm"`).

## 3) Connectivity with `<trace />`

Connect pins with port selectors:

```tsx
<trace from=".R1 > .pin1" to=".C1 > .pin1" />
```

Connect to named nets:

```tsx
<trace from=".U1 > .pin1" to="net.GND" />
<trace from=".U1 > .pin8" to="net.VCC" />
```

Useful trace props (optional)
- `width` / `thickness`
- `minLength` / `maxLength`

## 4) Grouping for PCB layout

Use `<group />` like a container to move/layout parts together.

```tsx
<board width="20mm" height="20mm">
  <group pcbX={5} pcbY={5}>
    <resistor name="R1" resistance="1k" footprint="0402" pcbX={2.5} pcbY={2.5} />
    <resistor name="R2" resistance="1k" footprint="0402" pcbX={2.5} pcbY={0} />
    <resistor name="R3" resistance="1k" footprint="0402" pcbX={2.5} pcbY={-2.5} />
  </group>
</board>
```

## 5) Autorouter choices

Boards and subcircuits can set an `autorouter` preset (e.g., `"auto"`, `"sequential-trace"`, `"auto-local"`, `"auto-cloud"`). For complex routing, cloud autorouting is often the most capable.

## 6) Manufacturing helpers

For turnkey assembly you will often want:
- `supplierPartNumbers` (pin a specific supplier SKU/part number)
- `doNotPlace` (exclude from automated placement)

Example:

```tsx
<capacitor
  name="C1"
  capacitance="100nF"
  footprint="0402"
  supplierPartNumbers={{ jlcpcb: "C14663" }}
/>

<resistor name="R1" resistance="10k" footprint="0402" doNotPlace />
```
