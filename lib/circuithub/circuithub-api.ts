/**
 * A small client for CircuitHub's public REST API
 * (https://api.circuithub.com/docs). Only the calls `tsci quote create` needs.
 */

export interface CircuithubUploadUrl {
  filename: string
  uploadUrl: string
  objectKey: string
  validTill?: string
  headers: [string, string][]
}

export interface CircuithubFileRef {
  objectKey: string
  filename: string
}

export interface CircuithubRevisionCreated {
  projectId: number
  revisionId: number
  statusUrl?: string
}

export interface CircuithubProjectStatus {
  status: "importing" | "complete" | "failed" | (string & {})
  [key: string]: unknown
}

export interface CircuithubBoard {
  boardId?: number
  hasCamReport?: boolean
  messages?: { level: string; message: string }[]
  spec?: Record<string, unknown>
  [key: string]: unknown
}

export interface CircuithubBomLine {
  id: number
  /** "resolved", "unresolved", "errored", or "not_fitted" (do-not-place). */
  status: string
  placements?: { ref: string; dnp?: boolean; side?: string }[]
  /** Older response shape; current responses list `placements`. */
  referenceDesignators?: string[]
  quantity?: number
  [key: string]: unknown
}

export const getBomLineRefs = (line: CircuithubBomLine): string[] =>
  line.placements?.map((placement) => placement.ref) ??
  line.referenceDesignators ??
  []

export interface CircuithubBom {
  revisionId: number
  bomLines: CircuithubBomLine[]
  summary?: {
    total: number
    resolved: number
    unresolved: number
    errored: number
    notFitted?: number
  }
}

export interface CircuithubLineItem {
  type: string
  amount: string
  [key: string]: unknown
}

export interface CircuithubOffer {
  id: number
  service: string
  fabricationCountry?: string
  assemblyLine?: string
  checkoutUrl?: string
  shipDate?: { earliest?: string; latest?: string }
  price: {
    lineItems: CircuithubLineItem[]
    discounts: { type: string; amount?: string; [key: string]: unknown }[]
    excludes?: unknown[]
    manufacturingSubtotal?: string
    manufacturingTotal: string
    manufacturingUnitPrice?: string
  }
}

export interface CircuithubQuote {
  id: number
  status: string
  type?: string
  quantity: number
  currency?: string
  orderable?: boolean
  expiresAt?: string
  projectId?: number
  revisionId?: number
  revisionNumber?: number
  offers: CircuithubOffer[]
  blockers?: { code: string; bomLineIds?: number[]; [key: string]: unknown }[]
  designFeedback?: {
    type: string
    summary?: string
    reasons?: string[]
    docsUrl?: string
    potential?: unknown
  }[]
}

export class CircuithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message)
    this.name = "CircuithubApiError"
  }
}

export interface CircuithubApiOptions {
  apiUrl: string
  token: string
  fetch?: typeof fetch
}

export const createCircuithubApi = ({
  apiUrl,
  token,
  fetch: fetchFn = globalThis.fetch,
}: CircuithubApiOptions) => {
  const call = async <T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const response = await fetchFn(`${apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) {
      let detail = text.slice(0, 500)
      try {
        const parsed = JSON.parse(text)
        detail =
          parsed?.error?.message ??
          parsed?.message ??
          parsed?.error ??
          JSON.stringify(parsed)
        if (typeof detail !== "string") detail = JSON.stringify(detail)
      } catch {}
      const hint =
        response.status === 401
          ? " The CircuitHub login was rejected; run `tsci auth add-provider circuithub` to log in again."
          : ""
      throw new CircuithubApiError(
        `CircuitHub ${method} ${path} failed with HTTP ${response.status}: ${detail}${hint}`,
        response.status,
        text,
      )
    }
    return (text ? JSON.parse(text) : null) as T
  }

  return {
    getUploadUrls: (
      workspace: string,
      files: { filename: string; size: number }[],
    ) =>
      call<{ uploads: CircuithubUploadUrl[] }>(
        "POST",
        "/projects/upload-urls",
        { workspace, files },
      ),

    /** PUT a file to the presigned URL from `getUploadUrls`. */
    uploadFile: async (upload: CircuithubUploadUrl, content: Uint8Array) => {
      const response = await fetchFn(upload.uploadUrl, {
        method: "PUT",
        headers: Object.fromEntries(upload.headers ?? []),
        body: content as BodyInit,
      })
      if (!response.ok) {
        throw new CircuithubApiError(
          `Uploading ${upload.filename} to CircuitHub failed with HTTP ${response.status}`,
          response.status,
          (await response.text()).slice(0, 500),
        )
      }
    },

    createProject: (body: {
      name: string
      workspace: string
      files: CircuithubFileRef[]
      exportClassification: CircuithubExportClassification
    }) => call<CircuithubRevisionCreated>("POST", "/projects", body),

    createRevision: (projectId: number, files: CircuithubFileRef[]) =>
      call<CircuithubRevisionCreated>(
        "POST",
        `/projects/${projectId}/revisions`,
        { files },
      ),

    getProjectStatus: (projectId: number) =>
      call<CircuithubProjectStatus>("GET", `/projects/${projectId}/status`),

    getBoard: (revisionId: number) =>
      call<CircuithubBoard>("GET", `/revisions/${revisionId}/board`),

    getBom: (projectId: number) =>
      call<CircuithubBom>("GET", `/projects/${projectId}/bom`),

    createQuote: (revisionId: number, quantity: number) =>
      call<CircuithubQuote>("POST", "/quotes", { revisionId, quantity }),
  }
}

export type CircuithubApi = ReturnType<typeof createCircuithubApi>

/** How CircuitHub records a project's export classification. */
export type CircuithubExportClassification =
  | { tag: "NotExportControlled" }
  | { tag: "EAR99" }
  | { tag: "ECCN"; contents: string }

/**
 * Read `--export-classification`: EAR99, NotExportControlled, or an ECCN
 * such as 3A001.
 */
export const parseCircuithubExportClassification = (
  value: string,
): CircuithubExportClassification => {
  const code = value.trim()
  if (/^ear99$/i.test(code)) return { tag: "EAR99" }
  if (/^not-?export-?controlled$/i.test(code)) {
    return { tag: "NotExportControlled" }
  }
  if (!/^\d[A-E]\d{3}/i.test(code)) {
    throw new Error(
      `Unknown export classification "${value}". Use EAR99, NotExportControlled, or an ECCN such as 3A001.`,
    )
  }
  return { tag: "ECCN", contents: code.toUpperCase() }
}
