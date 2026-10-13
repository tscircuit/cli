import fs from "node:fs"
import path from "node:path"
import type { PlatformConfig } from "@tscircuit/props"
import type { TscircuitRuntimeProjectConfig } from "../project-config"

export const scriptSafeJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

/** Transfer data, with browser-only hooks supplied by a separate browser module. */
export const getBrowserPlatformConfig = (
  config: TscircuitRuntimeProjectConfig | null | undefined,
  defaultJscdnBaseUrl: string,
): PlatformConfig => {
  const hasBrowserModule = Boolean(config?.browserPlatformConfigPath)
  const baseUrl = config?.platformConfig?.jscdnBaseUrl
  if (
    baseUrl !== undefined &&
    (typeof baseUrl !== "string" || !baseUrl.trim())
  ) {
    throw new Error("platformConfig.jscdnBaseUrl must be a non-empty string")
  }
  const json = JSON.stringify(config?.platformConfig ?? {}, (key, value) => {
    if (typeof value === "function") {
      if (!hasBrowserModule) {
        throw new Error(
          `platformConfig.${key} is a function. Set browserPlatformConfigPath to a browser-safe TS/JS module exporting the browser PlatformConfig, including its callable hooks.`,
        )
      }
      return undefined
    }
    return value
  })
  return {
    jscdnBaseUrl: defaultJscdnBaseUrl,
    ...JSON.parse(json),
  }
}

/**
 * Browser modules export PlatformConfig directly, for example:
 * export default { platformFetch: (url, init) => fetch(url, init) }
 * They are bundled separately from tscircuit.config.ts so Node hooks and .env
 * values are never implicitly embedded in public browser assets.
 */
export const bundleBrowserPlatformConfig = async (
  projectDir: string,
  configPath: string | undefined,
): Promise<string | undefined> => {
  if (!configPath) return
  const entry = path.resolve(projectDir, configPath)
  if (!fs.existsSync(entry)) {
    throw new Error(`Browser platform config not found: ${entry}`)
  }
  // Bun is also the CLI's supported browser build runtime. Node-only modules
  // fail here with an actionable build error instead of dropping their hooks.
  if (typeof Bun === "undefined") {
    throw new Error(
      "Bundling browserPlatformConfigPath requires Bun. Install Bun or run the CLI with Bun.",
    )
  }
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "esm",
    env: "disable",
    splitting: false,
  })
  if (!result.success || result.outputs.length !== 1) {
    throw new Error(
      `Could not bundle browserPlatformConfigPath: ${result.logs.join("\n")}`,
    )
  }
  return await result.outputs[0].text()
}

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  )

/** Both modules run in sequence so callable config hooks exist before boot. */
export const getRunframeBootScript = (
  standaloneScriptSrc: string,
  platformConfigScriptSrc?: string,
) =>
  platformConfigScriptSrc
    ? `<script type="module">
        import platformConfig from ${scriptSafeJson(platformConfigScriptSrc)};
        window.TSCIRCUIT_PLATFORM_CONFIG = { ...window.TSCIRCUIT_PLATFORM_CONFIG, ...platformConfig };
        await import(${scriptSafeJson(standaloneScriptSrc)});
      </script>`
    : `<script type="module" src="${escapeHtml(standaloneScriptSrc)}"></script>`
