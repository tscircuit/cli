import path from "node:path"
import { writeFileIfNotExists } from "./write-file-if-not-exists"

export const generateClaudeMd = (dir: string) => {
  const claudeMdPath = path.join(dir, "CLAUDE.md")
  const claudeMdContent = `# CLAUDE.md

This file provides guidance when working with code in this tscircuit project.

## Common Commands

**Development**:

- \`bun run dev\` or \`tsci dev\` - Start development server
- \`bun run build\` or \`tsci build\` - Build the project

**Testing**:

- \`bun run snapshot\` or \`tsci snapshot\` - Run snapshot tests
- \`bun run snapshot:update\` or \`tsci snapshot --update\` - Update snapshots

**Publishing**:

- \`tsci push\` - Push package to tscircuit registry

## Project Structure

- \`index.tsx\` - Main entry point for the circuit
- \`tscircuit.config.json\` - Project configuration
- \`.npmrc\` - NPM registry configuration for @tsci packages

## tscircuit Basics

This project uses tscircuit, a React-like library for designing electronic circuits.

### Components

Common components include:
- \`<board>\` - PCB board container
- \`<resistor>\` - Resistor component
- \`<capacitor>\` - Capacitor component
- \`<chip>\` - Integrated circuit
- \`<trace>\` - Electrical connection between components

### Footprints

Use standard footprint names:
- \`0402\`, \`0603\`, \`0805\` - SMD passive sizes
- \`SOIC-8\`, \`QFP-32\` - IC packages
- Custom footprints via \`footprint={...}\`

### Positioning

- \`schX\`, \`schY\` - Schematic position
- \`pcbX\`, \`pcbY\` - PCB position

## Before You're Done

- Run \`bun run build\` to verify the circuit compiles
- Run \`bun run snapshot\` to check visual output
`
  writeFileIfNotExists(claudeMdPath, claudeMdContent)
}
