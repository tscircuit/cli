import { loadRuntimeProjectConfig } from "../project-config"

/** Read only tab descriptors; never expose the rest of the project config. */
export async function readExtraRunFrameTabs(projectDir?: string) {
  const config = projectDir
    ? await loadRuntimeProjectConfig(projectDir, { throwOnError: true })
    : null
  return {
    tabs: (config?.extraRunFrameTabs ?? []).map((tab) => ({
      tab_name: tab.tabName,
      iframe_url: tab.iframeUrl,
      ...(tab.mainComponentPath === undefined
        ? {}
        : { main_component_path: tab.mainComponentPath }),
    })),
  }
}
