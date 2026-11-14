import fs from "node:fs"
import path from "node:path"
import {
  type CircuithubApi,
  type CircuithubBom,
  type CircuithubBoard,
  type CircuithubQuote,
  createCircuithubApi,
} from "./circuithub-api"
import {
  decodeCircuithubToken,
  getCircuithubApiUrl,
  getCircuithubToken,
  isCircuithubTokenExpired,
} from "./circuithub-config"
import {
  type CircuithubBomRow,
  getCircuithubBomRows,
  resolveCircuithubManufacturers,
} from "./generate-circuithub-bom"
import {
  type CircuithubProjectFile,
  generateCircuithubProjectFiles,
} from "./generate-circuithub-project-files"

export interface CreateCircuithubQuoteOptions {
  circuitJson: unknown[]
  projectName: string
  quantities: number[]
  workspace?: string
  /** Upload as a new revision of this project instead of a new project. */
  projectId?: number
  /** Required by CircuitHub for new projects, e.g. EAR99. */
  exportClassification?: string
  /** Write the uploaded files here. */
  outputDir?: string
  /** Generate the files but upload nothing and request no quote. */
  dryRun?: boolean
  /** How long to wait for CircuitHub's CAM analysis before quoting. */
  camTimeoutMs?: number
  importTimeoutMs?: number
  pollIntervalMs?: number
  log?: (message: string) => void
  fetch?: typeof fetch
}

export interface CircuithubQuoteResult {
  projectName: string
  workspace?: string
  files: { filename: string; size: number }[]
  outputDir?: string
  bom: {
    rows: CircuithubBomRow[]
    /** MPNs CircuitHub's part search didn't find. */
    unknownMpns: string[]
    /** Parts with no MPN in the tscircuit design. */
    missingMpns: string[]
  }
  projectId?: number
  revisionId?: number
  camReady?: boolean
  board?: CircuithubBoard
  circuithubBom?: CircuithubBom
  quotes: CircuithubQuote[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Poll `check` until it returns a value, or give up after `timeoutMs`. */
const pollUntil = async <T>(
  check: () => Promise<T | undefined>,
  { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number },
): Promise<T | undefined> => {
  const deadline = Date.now() + timeoutMs
  while (true) {
    const result = await check()
    if (result !== undefined) return result
    if (Date.now() + intervalMs > deadline) return undefined
    await sleep(intervalMs)
  }
}

const getAuthenticatedApi = (fetchFn?: typeof fetch): CircuithubApi | null => {
  const current = getCircuithubToken()
  if (!current) return null
  if (
    current.source === "login" &&
    isCircuithubTokenExpired(decodeCircuithubToken(current.token))
  ) {
    return null
  }
  return createCircuithubApi({
    apiUrl: getCircuithubApiUrl(),
    token: current.token,
    fetch: fetchFn,
  })
}

/**
 * Get CircuitHub quotes for a board:
 *
 * 1. Convert the circuit JSON to a KiCad project and a BOM CSV with
 *    Manufacturer + MPN + supplier part number per line (manufacturers come
 *    from CircuitHub's part search, so same-MPN listings resolve).
 * 2. Upload the files and create a project, or a revision of `projectId`.
 * 3. Wait for the import, then for CAM analysis: until CircuitHub has a CAM
 *    report, its board measurements (size, trace gap, drill) are
 *    preliminary and the quote can miss Grid Proto pricing.
 * 4. Request a quote for each quantity. Nothing is ordered.
 */
export const createCircuithubQuote = async (
  options: CreateCircuithubQuoteOptions,
): Promise<CircuithubQuoteResult> => {
  const log = options.log ?? (() => {})
  const pollIntervalMs = options.pollIntervalMs ?? 3000
  const api = getAuthenticatedApi(options.fetch)
  if (!api && !options.dryRun) {
    throw new Error(
      "Not logged in to CircuitHub (or the session expired). Run `tsci auth circuithub login`, or set CIRCUITHUB_TOKEN.",
    )
  }
  if (!options.dryRun) {
    if (!options.workspace) {
      throw new Error(
        "Pass --workspace <slug> (the workspace in your CircuitHub URL, app.circuithub.com/workspaces/<slug>), or set CIRCUITHUB_WORKSPACE.",
      )
    }
    if (options.projectId === undefined && !options.exportClassification) {
      throw new Error(
        "CircuitHub needs the board's export classification to create a project. Pass --export-classification (for example EAR99), or --project <id> to add a revision to an existing project.",
      )
    }
  }

  const bomRows = getCircuithubBomRows(options.circuitJson)
  const missingMpns = bomRows
    .filter((row) => !row.mpn)
    .flatMap((row) => row.referenceDesignators)
  let unknownMpns: string[] = []
  if (api) {
    const { unresolved } = await resolveCircuithubManufacturers(
      bomRows,
      api.searchParts,
    )
    unknownMpns = unresolved
    log(
      `Matched ${bomRows.filter((row) => row.manufacturer).length}/${bomRows.filter((row) => row.mpn).length} part numbers in CircuitHub's catalog`,
    )
  }

  const files = generateCircuithubProjectFiles({
    circuitJson: options.circuitJson,
    projectName: options.projectName,
    bomRows,
  })
  const encoded = files.map((file: CircuithubProjectFile) => ({
    filename: file.filename,
    content: new TextEncoder().encode(file.content),
  }))
  if (options.outputDir) {
    fs.mkdirSync(options.outputDir, { recursive: true })
    for (const file of encoded) {
      fs.writeFileSync(
        path.join(options.outputDir, file.filename),
        file.content,
      )
    }
  }

  const result: CircuithubQuoteResult = {
    projectName: options.projectName,
    workspace: options.workspace,
    files: encoded.map((file) => ({
      filename: file.filename,
      size: file.content.byteLength,
    })),
    outputDir: options.outputDir,
    bom: { rows: bomRows, unknownMpns, missingMpns },
    quotes: [],
  }
  if (options.dryRun || !api) return result

  log(`Uploading ${encoded.length} files to CircuitHub...`)
  const { uploads } = await api.getUploadUrls(options.workspace!, result.files)
  for (const upload of uploads) {
    const file = encoded.find(
      (candidate) => candidate.filename === upload.filename,
    )
    if (!file)
      throw new Error(
        `CircuitHub returned an upload URL for unknown file ${upload.filename}`,
      )
    await api.uploadFile(upload, file.content)
  }
  const fileRefs = uploads.map((upload) => ({
    objectKey: upload.objectKey,
    filename: upload.filename,
  }))
  const created =
    options.projectId !== undefined
      ? await api.createRevision(options.projectId, fileRefs)
      : await api.createProject({
          name: options.projectName,
          workspace: options.workspace!,
          files: fileRefs,
          exportClassification: options.exportClassification!,
        })
  result.projectId = created.projectId
  result.revisionId = created.revisionId
  log(
    options.projectId !== undefined
      ? `Created revision ${created.revisionId} of project ${created.projectId}`
      : `Created project ${created.projectId} (revision ${created.revisionId})`,
  )

  log("Waiting for CircuitHub to import the design...")
  const status = await pollUntil(
    async () => {
      const current = await api.getProjectStatus(created.projectId)
      return current.status === "importing" ? undefined : current
    },
    {
      timeoutMs: options.importTimeoutMs ?? 10 * 60_000,
      intervalMs: pollIntervalMs,
    },
  )
  if (!status)
    throw new Error("Timed out waiting for CircuitHub to import the design")
  if (status.status !== "complete") {
    throw new Error(
      `CircuitHub could not import the design (status: ${status.status}): ${JSON.stringify(status)}`,
    )
  }

  log("Waiting for CircuitHub's CAM analysis...")
  let lastBoard: CircuithubBoard | undefined
  const camBoard = await pollUntil(
    async () => {
      lastBoard = await api.getBoard(created.revisionId)
      return lastBoard.hasCamReport ? lastBoard : undefined
    },
    {
      timeoutMs: options.camTimeoutMs ?? 15 * 60_000,
      intervalMs: pollIntervalMs,
    },
  )
  result.camReady = Boolean(camBoard)
  result.board = camBoard ?? lastBoard
  if (!camBoard) {
    log(
      "CAM analysis isn't finished; quoting with CircuitHub's preliminary board measurements.",
    )
  }

  result.circuithubBom = await api.getBom(created.projectId)

  for (const quantity of options.quantities) {
    log(
      `Requesting a quote for ${quantity} board${quantity === 1 ? "" : "s"}...`,
    )
    result.quotes.push(await api.createQuote(created.revisionId, quantity))
  }
  return result
}
