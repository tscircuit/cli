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

export interface CircuithubPart {
  id: number
  mpn: string
  manufacturer: string
  description?: string | null
  available?: number | null
  moq?: number | null
}

export interface CircuithubPartSearch {
  exactMatches: CircuithubPart[]
  inexactMatches: CircuithubPart[]
}

export interface CircuithubBomLine {
  id: number
  referenceDesignators: string[]
  status: string
  resolvedManufacturer?: string | null
  resolvedPartMpn?: string | null
  value?: string | null
}

export interface CircuithubBom {
  revisionId: number
  bomLines: CircuithubBomLine[]
  summary?: {
    total: number
    resolved: number
    unresolved: number
    errored: number
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
          ? " Run `tsci auth circuithub login` to log in again."
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
      exportClassification: string
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

    searchParts: (query: string) =>
      call<CircuithubPartSearch>(
        "GET",
        `/parts?${new URLSearchParams({ q: query })}`,
      ),

    createQuote: (revisionId: number, quantity: number) =>
      call<CircuithubQuote>("POST", "/quotes", { revisionId, quantity }),
  }
}

export type CircuithubApi = ReturnType<typeof createCircuithubApi>
