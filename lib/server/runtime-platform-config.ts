import type { PlatformConfig } from "@tscircuit/props"

const RUNTIME_PLATFORM_CONFIG_CALL_PATH = "/__tsci/runtime-platform-config/call"

const SENSITIVE_KEY_PATTERN = /token|secret|password/i

const getValueAtPath = (value: unknown, path: string[]) => {
  let current = value
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

const hasSerializableChildren = (value: unknown): boolean => {
  if (typeof value === "function") return true
  if (Array.isArray(value)) {
    return value.some((item) => hasSerializableChildren(item))
  }
  if (!value || typeof value !== "object") return true

  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue
    if (hasSerializableChildren(child)) return true
  }

  return false
}

const serializeClientValue = (value: unknown, path: string[]): string => {
  if (typeof value === "function") {
    return `async (...args) => {
      const response = await fetch(${JSON.stringify(
        RUNTIME_PLATFORM_CONFIG_CALL_PATH,
      )}, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: ${JSON.stringify(path)}, args }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to call runtime platform config function")
      }
      return payload.result
    }`
  }

  if (value === undefined) {
    return "undefined"
  }

  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return JSON.stringify(value)
  }

  if (typeof value === "string") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item, index) => serializeClientValue(item, [...path, String(index)])).join(",")}]`
  }

  if (!value || typeof value !== "object") {
    return "undefined"
  }

  const entries = Object.entries(value)
    .filter(
      ([key, child]) =>
        !SENSITIVE_KEY_PATTERN.test(key) && hasSerializableChildren(child),
    )
    .map(
      ([key, child]) =>
        `${JSON.stringify(key)}:${serializeClientValue(child, [...path, key])}`,
    )

  return `{${entries.join(",")}}`
}

export const createRuntimePlatformConfigClientScript = (
  platformConfig?: PlatformConfig,
) => {
  if (!platformConfig) return ""

  return `
        window.TSCIRCUIT_RUNTIME_PLATFORM_CONFIG = ${serializeClientValue(platformConfig, [])};
  `
}

export const invokeRuntimePlatformConfigFunction = async (
  platformConfig: PlatformConfig | undefined,
  path: string[],
  args: unknown[],
) => {
  if (!platformConfig) {
    throw new Error("No runtime platform config is available")
  }

  const parentPath = path.slice(0, -1)
  const fnName = path[path.length - 1]
  const parentValue =
    parentPath.length > 0
      ? getValueAtPath(platformConfig, parentPath)
      : platformConfig

  if (!parentValue || typeof parentValue !== "object") {
    throw new Error(`Invalid runtime platform config path: ${path.join(".")}`)
  }

  const fn = (parentValue as Record<string, unknown>)[fnName]
  if (typeof fn !== "function") {
    throw new Error(
      `Runtime platform config path is not callable: ${path.join(".")}`,
    )
  }

  return await fn.apply(parentValue, args)
}

export const patchStandaloneForRuntimePlatformConfig = (
  standaloneContent: string,
) => {
  if (standaloneContent.includes("TSCIRCUIT_RUNTIME_PLATFORM_CONFIG")) {
    return standaloneContent
  }

  const originalSnippet =
    "if(t.projectConfig)for(const _ of f4e(t.projectConfig))await s.setProjectConfigProperty(_,l(BEt(t.projectConfig,_))).catch(h=>{throw new Error(`Error setting project config property ${_}: ${h instanceof Error?h.message:String(h)}`)})"

  const replacementSnippet =
    "const __tsciRuntimeProjectConfig={...(globalThis.TSCIRCUIT_RUNTIME_PLATFORM_CONFIG??{}),...(t.projectConfig??{})};if(Object.keys(__tsciRuntimeProjectConfig).length>0)for(const _ of f4e(__tsciRuntimeProjectConfig))await s.setProjectConfigProperty(_,l(BEt(__tsciRuntimeProjectConfig,_))).catch(h=>{throw new Error(`Error setting project config property ${_}: ${h instanceof Error?h.message:String(h)}`)})"

  if (!standaloneContent.includes(originalSnippet)) {
    throw new Error(
      "Unable to patch runframe standalone bundle for runtime platform config",
    )
  }

  return standaloneContent.replace(originalSnippet, replacementSnippet)
}
