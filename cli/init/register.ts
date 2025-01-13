import type { Command } from "commander"
import * as fs from "node:fs"
import * as path from "node:path"

export const registerInit = (program: Command) => {
  program
    .command("init")
    .description("Initialize a new TSCircuit project in the current directory")
    .action(() => {
      const currentDir = process.cwd()

      const indexFilePath = path.join(currentDir, "index.tsx")
      const npmrcFilePath = path.join(currentDir, ".npmrc")

      const indexContent = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
);
`

      const npmrcContent = `
@tsci:registry=https://npm.tscircuit.com
`

      if (!fs.existsSync(indexFilePath)) {
        fs.writeFileSync(indexFilePath, indexContent.trimStart())
        console.log(`Created: ${indexFilePath}`)
      } else {
        console.log(`Skipped: ${indexFilePath} already exists`)
      }

      if (!fs.existsSync(npmrcFilePath)) {
        fs.writeFileSync(npmrcFilePath, npmrcContent.trimStart())
        console.log(`Created: ${npmrcFilePath}`)
      } else {
        console.log(`Skipped: ${npmrcFilePath} already exists`)
      }

      console.log(
        `Initialization complete. Run "tsci dev" to start developing.`,
      )
    })
}
