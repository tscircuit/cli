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
  getLastCircuithubRevision,
  isCircuithubTokenExpired,
  saveLastCircuithubRevision,
} from "./circuithub-config"
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
  /**
   * Wait for CircuitHub to measure the board before quoting (about 1.5
   * minutes), instead of quoting right after the import.
   */
  wait?: boolean
  /** With `wait`, the longest to wait for the measurement. */
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
  projectId?: number
  revisionId?: number
  /** Whether CircuitHub had measured the board when it quoted. */
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

/**
 * Whether CircuitHub has measured the board. `hasCamReport` alone isn't
 * enough: it turns true while the spec still holds the import's preliminary
 * values (outline + 0.1mm, trace gap 0, no drill size). The real values
 * arrive in a later board version, so wait for a measured gap and drill.
 * A board with no holes never gets a drill size and waits out the timeout.
 */
export const isBoardMeasured = (board: CircuithubBoard) => {
  const spec = (board.spec ?? {}) as {
    minPitchMM?: number | null
    minHoleSizeMM?: number | null
  }
  return Boolean(
    board.hasCamReport &&
      (spec.minPitchMM ?? 0) > 0 &&
      spec.minHoleSizeMM != null,
  )
}

/**
 * Check the options an upload needs, so the command can fail before asking
 * the user to log in or generating anything.
 */
export const validateCircuithubQuoteOptions = (
  options: Pick<
    CreateCircuithubQuoteOptions,
    "dryRun" | "workspace" | "projectId" | "exportClassification"
  >,
) => {
  if (options.dryRun) return
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

const requireAuthenticatedApi = (fetchFn?: typeof fetch): CircuithubApi => {
  const api = getAuthenticatedApi(fetchFn)
  if (!api) {
    throw new Error(
      "Not logged in to CircuitHub (or the session expired). Run `tsci auth add-provider circuithub`, or set CIRCUITHUB_TOKEN.",
    )
  }
  return api
}

/**
 * Quote an uploaded revision: read the board (or, with `wait`, poll until
 * CircuitHub has measured it), request a quote per quantity, and read
 * CircuitHub's BOM for the project.
 */
const quoteRevision = async ({
  api,
  revisionId,
  quantities,
  wait,
  camTimeoutMs = 15 * 60_000,
  pollIntervalMs,
  log,
}: {
  api: CircuithubApi
  revisionId: number
  quantities: number[]
  wait?: boolean
  camTimeoutMs?: number
  pollIntervalMs: number
  log: (message: string) => void
}) => {
  let board = await api.getBoard(revisionId)
  if (wait && !isBoardMeasured(board)) {
    log("Waiting for CircuitHub to measure the board (usually ~1.5 min)...")
    board =
      (await pollUntil(
        async () => {
          board = await api.getBoard(revisionId)
          return isBoardMeasured(board) ? board : undefined
        },
        { timeoutMs: camTimeoutMs, intervalMs: pollIntervalMs },
      )) ?? board
  }
  const camReady = isBoardMeasured(board)

  const quotes: CircuithubQuote[] = []
  for (const quantity of quantities) {
    log(
      `Requesting a quote for ${quantity} board${quantity === 1 ? "" : "s"}...`,
    )
    quotes.push(await api.createQuote(revisionId, quantity))
  }
  const projectId = quotes[0]?.projectId
  const circuithubBom =
    projectId !== undefined ? await api.getBom(projectId) : undefined
  return { board, camReady, quotes, projectId, circuithubBom }
}

/**
 * Get CircuitHub quotes for a board:
 *
 * 1. Export the KiCad project the way tsci always does. CircuitHub reads
 *    the part numbers from it and reports what it can't match.
 * 2. Upload it and create a project, or a revision of `projectId`.
 * 3. Wait for the import, then quote. CircuitHub measures the board about
 *    1.5 minutes after the upload; quotes before that use preliminary
 *    values (see `isBoardMeasured`) and can miss Grid Proto pricing, so
 *    either pass `wait`, or re-quote later with `refreshCircuithubQuote`.
 * 4. Request a quote for each quantity. Nothing is ordered.
 */
export const createCircuithubQuote = async (
  options: CreateCircuithubQuoteOptions,
): Promise<CircuithubQuoteResult> => {
  const log = options.log ?? (() => {})
  const pollIntervalMs = options.pollIntervalMs ?? 3000
  const api = options.dryRun ? null : requireAuthenticatedApi(options.fetch)
  validateCircuithubQuoteOptions(options)

  const files = generateCircuithubProjectFiles({
    circuitJson: options.circuitJson,
    projectName: options.projectName,
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

  saveLastCircuithubRevision({
    projectId: created.projectId,
    revisionId: created.revisionId,
  })

  const quoted = await quoteRevision({
    api,
    revisionId: created.revisionId,
    quantities: options.quantities,
    wait: options.wait,
    camTimeoutMs: options.camTimeoutMs,
    pollIntervalMs: options.pollIntervalMs ?? 5000,
    log,
  })
  result.camReady = quoted.camReady
  result.board = quoted.board
  result.quotes = quoted.quotes
  result.circuithubBom = quoted.circuithubBom
  return result
}

export interface RefreshCircuithubQuoteOptions {
  /** The revision to re-quote (default: the last one uploaded). */
  revisionId?: number
  quantities: number[]
  wait?: boolean
  camTimeoutMs?: number
  pollIntervalMs?: number
  log?: (message: string) => void
  fetch?: typeof fetch
}

/**
 * Re-quote a revision that was already uploaded, without uploading again.
 * Use it after `tsci quote create --circuithub` returned preliminary prices,
 * once CircuitHub has measured the board.
 */
export const refreshCircuithubQuote = async (
  options: RefreshCircuithubQuoteOptions,
): Promise<CircuithubQuoteResult> => {
  const log = options.log ?? (() => {})
  const api = requireAuthenticatedApi(options.fetch)
  const revisionId =
    options.revisionId ?? getLastCircuithubRevision()?.revisionId
  if (revisionId === undefined) {
    throw new Error(
      "No CircuitHub revision to refresh. Pass its number (printed by `tsci quote create --circuithub`), or quote a board first.",
    )
  }
  const quoted = await quoteRevision({
    api,
    revisionId,
    quantities: options.quantities,
    wait: options.wait,
    camTimeoutMs: options.camTimeoutMs,
    pollIntervalMs: options.pollIntervalMs ?? 5000,
    log,
  })
  return {
    projectName: "",
    files: [],
    projectId: quoted.projectId,
    revisionId,
    camReady: quoted.camReady,
    board: quoted.board,
    circuithubBom: quoted.circuithubBom,
    quotes: quoted.quotes,
  }
}
