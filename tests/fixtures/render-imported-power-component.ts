import { rm, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { temporaryDirectory } from "tempy"

export async function renderImportedPowerComponent({
  tsx,
  componentName,
  alias,
}: {
  tsx: string
  componentName: string
  alias?: string
}) {
  const tmpDir = temporaryDirectory()
  globalThis.deferredCleanupFns.push(() =>
    rm(tmpDir, { recursive: true, force: true }),
  )
  await symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  const filePath = path.join(tmpDir, "power.circuit.tsx")
  await writeFile(
    filePath,
    `${tsx}
export default () => <board width={12} height={12}>
  <${componentName} name="U1" />
  ${alias ? `<net name="probe" /><trace from={${JSON.stringify(`.U1 > .${alias}`)}} to="net.probe" />` : ""}
</board>
`,
  )
  return (await generateCircuitJson({ filePath })).circuitJson
}
