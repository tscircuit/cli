import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Command } from "commander"
import { loadEntry } from "pcb-spice-pipeline"

await new Command()
  .argument("<entry>")
  .requiredOption("--out <directory>")
  .action(async (entry: string, options: { out: string }) => {
    const input = await loadEntry(resolve(entry))
    if (process.env.PCB_SPICE_FAIL_PIPELINE === "true") {
      throw new Error("Native solver failed")
    }
    await mkdir(options.out, { recursive: true })
    await writeFile(join(options.out, "receipt.json"), JSON.stringify(input))
    const reportPath = join(options.out, "results.html")
    await writeFile(reportPath, "<html>Test report</html>")
    console.log(reportPath)
  })
  .parseAsync(process.argv)
