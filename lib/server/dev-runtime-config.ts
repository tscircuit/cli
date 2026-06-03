import type http from "node:http"
import type { PlatformConfig } from "@tscircuit/props"
import {
  loadRuntimeProjectConfig,
  type TscircuitRuntimeProjectConfig,
} from "lib/project-config"

export const DEV_RUNTIME_CONFIG_FUNCTION_REF_KEY =
  "__tscircuitDevServerRpcFunction"
export const DEV_RUNTIME_CONFIG_BINARY_REF_KEY = "__tscircuitDevServerRpcBinary"
export const DEV_RUNTIME_CONFIG_RESPONSE_REF_KEY =
  "__tscircuitDevServerRpcResponse"
export const DEV_RUNTIME_CONFIG_REQUEST_REF_KEY =
  "__tscircuitDevServerRpcRequest"
export const DEV_RUNTIME_CONFIG_HEADERS_REF_KEY =
  "__tscircuitDevServerRpcHeaders"

type RpcTarget =
  | {
      type: "path"
      path: string[]
    }
  | {
      type: "handle"
      id: string
    }

type RpcFunctionRef = {
  [DEV_RUNTIME_CONFIG_FUNCTION_REF_KEY]: true
  target: RpcTarget
}

type RpcRequestBody = {
  target: RpcTarget
  args?: unknown[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const isResponse = (value: unknown): value is Response =>
  typeof Response !== "undefined" && value instanceof Response

const isRequest = (value: unknown): value is Request =>
  typeof Request !== "undefined" && value instanceof Request

const isHeaders = (value: unknown): value is Headers =>
  typeof Headers !== "undefined" && value instanceof Headers

const toBase64 = (value: ArrayBufferLike | ArrayBufferView) => {
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    ).toString("base64")
  }

  return Buffer.from(value).toString("base64")
}

const fromBase64 = (value: string) => {
  const buffer = Buffer.from(value, "base64")
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

const headersToEntries = (headers: Headers): [string, string][] => {
  const entries: [string, string][] = []
  headers.forEach((value, key) => entries.push([key, value]))
  return entries
}

const getRuntimePlatformConfig = (
  runtimeConfig: TscircuitRuntimeProjectConfig | null,
): PlatformConfig | undefined => {
  if (!runtimeConfig) return undefined

  const platformConfig: PlatformConfig = {
    ...(runtimeConfig.includeBoardFiles && {
      includeBoardFiles: runtimeConfig.includeBoardFiles,
    }),
    ...(runtimeConfig.snapshotsDir && {
      snapshotsDir: runtimeConfig.snapshotsDir,
    }),
    ...(runtimeConfig.platformConfig ?? {}),
  }

  return Object.keys(platformConfig).length > 0 ? platformConfig : undefined
}

const getValueAndParentAtPath = (
  root: Record<string, unknown>,
  path: string[],
) => {
  if (path.length === 0) {
    return { parent: undefined, value: root }
  }

  let parent: unknown = undefined
  let value: unknown = root

  for (const key of path) {
    parent = value
    if (!isRecord(parent) && typeof parent !== "function") {
      return { parent: undefined, value: undefined }
    }
    value = (parent as Record<string, unknown>)[key]
  }

  return { parent, value }
}

const collectObjectEntries = (value: Record<string, unknown>) => {
  const entries = new Map<string, unknown>(Object.entries(value))

  let proto = Object.getPrototypeOf(value)
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor" || entries.has(key)) continue

      const descriptor = Object.getOwnPropertyDescriptor(proto, key)
      if (!descriptor || typeof descriptor.value !== "function") continue

      entries.set(key, descriptor.value.bind(value))
    }
    proto = Object.getPrototypeOf(proto)
  }

  return entries
}

export const createDevRuntimeConfigApi = ({
  projectDir,
}: {
  projectDir: string
}) => {
  const functionHandles = new Map<string, (...args: any[]) => unknown>()
  let nextFunctionHandleId = 0

  const encodeValue = async (
    value: unknown,
    opts: {
      path?: string[]
      usePathFunctionRefs?: boolean
      thisArg?: unknown
    } = {},
  ): Promise<unknown> => {
    if (typeof value === "function") {
      if (opts.usePathFunctionRefs && opts.path) {
        return {
          [DEV_RUNTIME_CONFIG_FUNCTION_REF_KEY]: true,
          target: {
            type: "path",
            path: opts.path,
          },
        } satisfies RpcFunctionRef
      }

      const id = String(++nextFunctionHandleId)
      functionHandles.set(
        id,
        opts.thisArg
          ? value.bind(opts.thisArg)
          : (value as (...args: any[]) => unknown),
      )
      return {
        [DEV_RUNTIME_CONFIG_FUNCTION_REF_KEY]: true,
        target: {
          type: "handle",
          id,
        },
      } satisfies RpcFunctionRef
    }

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value
    }

    if (value === undefined) return null

    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return {
        [DEV_RUNTIME_CONFIG_BINARY_REF_KEY]: true,
        base64: toBase64(value),
      }
    }

    if (isHeaders(value)) {
      return {
        [DEV_RUNTIME_CONFIG_HEADERS_REF_KEY]: true,
        entries: headersToEntries(value),
      }
    }

    if (isRequest(value)) {
      const requestBody =
        value.method === "GET" || value.method === "HEAD"
          ? undefined
          : await value.clone().arrayBuffer()
      return {
        [DEV_RUNTIME_CONFIG_REQUEST_REF_KEY]: true,
        url: value.url,
        method: value.method,
        headers: headersToEntries(value.headers),
        body: requestBody
          ? {
              [DEV_RUNTIME_CONFIG_BINARY_REF_KEY]: true,
              base64: toBase64(requestBody),
            }
          : undefined,
      }
    }

    if (isResponse(value)) {
      return {
        [DEV_RUNTIME_CONFIG_RESPONSE_REF_KEY]: true,
        status: value.status,
        statusText: value.statusText,
        headers: headersToEntries(value.headers),
        body: {
          [DEV_RUNTIME_CONFIG_BINARY_REF_KEY]: true,
          base64: toBase64(await value.clone().arrayBuffer()),
        },
      }
    }

    if (Array.isArray(value)) {
      return Promise.all(
        value.map((item, index) =>
          encodeValue(item, {
            path: opts.path ? [...opts.path, String(index)] : undefined,
            usePathFunctionRefs: opts.usePathFunctionRefs,
            thisArg: value,
          }),
        ),
      )
    }

    if (isRecord(value)) {
      const encodedEntries = await Promise.all(
        Array.from(collectObjectEntries(value)).map(async ([key, item]) => [
          key,
          await encodeValue(item, {
            path: opts.path ? [...opts.path, key] : undefined,
            usePathFunctionRefs: opts.usePathFunctionRefs,
            thisArg: value,
          }),
        ]),
      )
      return Object.fromEntries(encodedEntries)
    }

    return value
  }

  const decodeValue = (value: unknown): unknown => {
    if (!isRecord(value)) {
      if (Array.isArray(value)) return value.map(decodeValue)
      return value
    }

    if (value[DEV_RUNTIME_CONFIG_BINARY_REF_KEY]) {
      return fromBase64(String(value.base64))
    }

    if (value[DEV_RUNTIME_CONFIG_HEADERS_REF_KEY]) {
      return new Headers(value.entries as [string, string][])
    }

    if (value[DEV_RUNTIME_CONFIG_REQUEST_REF_KEY]) {
      const body = value.body ? decodeValue(value.body) : undefined
      return new Request(String(value.url), {
        method: String(value.method),
        headers: value.headers as [string, string][],
        body:
          body instanceof ArrayBuffer
            ? Buffer.from(body)
            : (body as BodyInit | undefined),
      })
    }

    if (value[DEV_RUNTIME_CONFIG_RESPONSE_REF_KEY]) {
      const body = value.body ? decodeValue(value.body) : undefined
      return new Response(
        body instanceof ArrayBuffer
          ? Buffer.from(body)
          : (body as BodyInit | undefined),
        {
          status: Number(value.status),
          statusText: String(value.statusText ?? ""),
          headers: value.headers as [string, string][],
        },
      )
    }

    if (Array.isArray(value)) return value.map(decodeValue)

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, decodeValue(item)]),
    )
  }

  const getRuntimeConfigPayload = async () => {
    const runtimeConfig = await loadRuntimeProjectConfig(projectDir)
    const platformConfig = getRuntimePlatformConfig(runtimeConfig)

    return {
      platformConfig: platformConfig
        ? await encodeValue(platformConfig, {
            path: [],
            usePathFunctionRefs: true,
          })
        : undefined,
    }
  }

  const invokeRpc = async (body: RpcRequestBody) => {
    const args = (body.args ?? []).map(decodeValue)
    let fn: unknown
    let thisArg: unknown

    if (body.target.type === "path") {
      const runtimeConfig = await loadRuntimeProjectConfig(projectDir)
      const platformConfig = getRuntimePlatformConfig(runtimeConfig)
      if (!platformConfig) {
        throw new Error("No runtime platformConfig is available")
      }

      const resolved = getValueAndParentAtPath(
        platformConfig as Record<string, unknown>,
        body.target.path,
      )
      fn = resolved.value
      thisArg = resolved.parent
    } else {
      fn = functionHandles.get(body.target.id)
    }

    if (typeof fn !== "function") {
      throw new Error("Runtime platformConfig RPC target is not a function")
    }

    return {
      result: await encodeValue(await fn.apply(thisArg, args)),
    }
  }

  return {
    getRuntimeConfigPayload,
    invokeRpc,
  }
}

const readJsonBody = async (req: http.IncomingMessage, url: URL) => {
  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req as unknown as BodyInit,
    duplex: "half",
  } as RequestInit)

  return request.json()
}

const sendJson = (
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" })
  res.end(JSON.stringify(payload))
}

export const handleDevRuntimeConfigRequest = async ({
  req,
  res,
  url,
  runtimeConfigApi,
}: {
  req: http.IncomingMessage
  res: http.ServerResponse
  url: URL
  runtimeConfigApi: ReturnType<typeof createDevRuntimeConfigApi>
}) => {
  try {
    if (url.pathname === "/api/dev/runtime-config" && req.method === "GET") {
      sendJson(res, 200, await runtimeConfigApi.getRuntimeConfigPayload())
      return true
    }

    if (
      url.pathname === "/api/dev/runtime-config/rpc" &&
      req.method === "POST"
    ) {
      const body = (await readJsonBody(req, url)) as RpcRequestBody
      sendJson(res, 200, await runtimeConfigApi.invokeRpc(body))
      return true
    }
  } catch (error) {
    sendJson(res, 500, {
      error_code: "DEV_RUNTIME_CONFIG_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Failed to process runtime config request",
    })
    return true
  }

  return false
}
