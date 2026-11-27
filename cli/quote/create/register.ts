import fs from "node:fs"
import path from "node:path"
import { type Command, InvalidArgumentError } from "commander"
import kleur from "kleur"
import {
  getSavedCircuithubWorkspace,
  saveCircuithubWorkspace,
} from "lib/circuithub/circuithub-config"
import {
  createCircuithubQuote,
  validateCircuithubQuoteOptions,
} from "lib/circuithub/create-circuithub-quote"
import { hasCircuithubSession } from "lib/circuithub/circuithub-provider"
import { formatCircuithubQuoteResult } from "lib/circuithub/format-circuithub-quote"
import { getEntrypoint } from "lib/shared/get-entrypoint"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { isCircuitJsonFile } from "lib/shared/is-circuit-json-file"
import {
  getQuoteCommand,
  parseCamTimeoutMinutes,
  parseQuoteQuantities,
  reportCircuithubError,
} from "../shared"

interface QuoteCreateOptions {
  circuithub?: boolean
  workspace?: string
  project?: number
  name?: string
  exportClassification?: string
  quantity?: number[]
  outputDir?: string
  dryRun?: boolean
  wait?: boolean
  camTimeout: number
  json?: boolean
}

const parseProjectId = (text: string) => {
  const id = Number(text)
  if (!Number.isInteger(id) || id < 1) {
    throw new InvalidArgumentError("Project must be a CircuitHub project ID.")
  }
  return id
}

/** `boards/nema8/index.circuit.tsx` -> `nema8`; `amp.circuit.tsx` -> `amp`. */
export const getDefaultProjectName = (filePath: string) => {
  const base = path
    .basename(filePath)
    .replace(/(\.circuit)?\.(tsx?|jsx?|json)$/, "")
  const name =
    base === "index" || base === "circuit"
      ? path.basename(path.dirname(path.resolve(filePath)))
      : base
  return (
    name.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "board"
  )
}

/** Progress goes to stderr so `--json` keeps stdout parseable. */
const logToStderr = (message: string) => console.error(message)

export const registerQuoteCreate = (program: Command) => {
  getQuoteCommand(program)
    .command("create")
    .description(
      "Get a manufacturer's quote for a board (nothing is ordered). For an offline JLCPCB estimate, use `tsci quote estimate`",
    )
    .argument("[file]", "Path to the source file or circuit JSON to quote")
    .option(
      "--circuithub",
      "Quote assembled boards with CircuitHub (add it first with `tsci auth add-provider circuithub`): uploads the KiCad project and BOM, waits for CircuitHub's analysis and prints its offers",
    )
    .option(
      "--workspace <slug>",
      "CircuitHub workspace to create the project in (remembered after first use)",
    )
    .option(
      "--project <id>",
      "Add a revision to this CircuitHub project instead of creating one",
      parseProjectId,
    )
    .option("--name <name>", "CircuitHub project name (default: from the file)")
    .option(
      "--export-classification <code>",
      "Export classification CircuitHub requires for new projects, e.g. EAR99",
    )
    .option(
      "--quantity <counts>",
      "Boards to quote, or a comma-separated list like 1,5,25 (default: 5)",
      parseQuoteQuantities,
    )
    .option("--output-dir <dir>", "Also write the uploaded KiCad project here")
    .option(
      "--dry-run",
      "Generate the KiCad project without uploading anything",
    )
    .option(
      "--wait",
      "Wait for CircuitHub to measure the board (~1.5 min) and quote final prices, instead of quoting right after the upload",
    )
    .option(
      "--cam-timeout <minutes>",
      "With --wait, the longest to wait for the measurement",
      parseCamTimeoutMinutes,
      15,
    )
    .option("--json", "Output the result as JSON")
    .action(async (file: string | undefined, options: QuoteCreateOptions) => {
      if (!options.circuithub) {
        console.error(
          "Choose the manufacturer to quote with: --circuithub. For an offline JLCPCB estimate, use `tsci quote estimate`.",
        )
        process.exitCode = 1
        return
      }
      if (!options.dryRun && !hasCircuithubSession()) {
        console.error(
          "CircuitHub isn't added yet. Run `tsci auth add-provider circuithub` to sign in, then try again.",
        )
        process.exitCode = 1
        return
      }
      const workspace = options.workspace ?? getSavedCircuithubWorkspace()
      try {
        validateCircuithubQuoteOptions({
          dryRun: options.dryRun,
          workspace,
          projectId: options.project,
          exportClassification: options.exportClassification,
        })
        const filePath = await getEntrypoint({
          filePath: file,
          onSuccess: (message) => logToStderr(kleur.gray(message)),
          onError: logToStderr,
          onWarning: (message) => logToStderr(kleur.yellow(message)),
        })
        if (!filePath) {
          process.exitCode = 1
          return
        }
        const circuitJson: unknown[] = isCircuitJsonFile(filePath)
          ? JSON.parse(await fs.promises.readFile(filePath, "utf-8"))
          : ((await getOrGenerateCircuitJson({ filePath }))
              .circuitJson as unknown[])

        const result = await createCircuithubQuote({
          circuitJson,
          projectName: options.name ?? getDefaultProjectName(filePath),
          quantities: options.quantity ?? [5],
          workspace,
          projectId: options.project,
          exportClassification: options.exportClassification,
          outputDir: options.outputDir
            ? path.resolve(options.outputDir)
            : undefined,
          dryRun: options.dryRun,
          wait: options.wait,
          camTimeoutMs: options.camTimeout * 60_000,
          log: (message) => logToStderr(kleur.gray(message)),
        })
        if (workspace && !options.dryRun) saveCircuithubWorkspace(workspace)

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
          return
        }
        if (options.dryRun) {
          console.log(
            `Files for CircuitHub${result.outputDir ? ` in ${result.outputDir}` : ""}: ${result.files.map((f) => f.filename).join(", ")}`,
          )
          console.log(kleur.gray("Dry run: nothing was uploaded."))
          return
        }
        console.log(formatCircuithubQuoteResult(result))
      } catch (error) {
        reportCircuithubError(error)
        process.exitCode = 1
      }
    })
}
