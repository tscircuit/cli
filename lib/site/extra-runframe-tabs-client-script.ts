/** Runs in dev HTML independently of the selected RunFrame browser bundle. */
export const extraRunFrameTabsClientScript = `{
  let stopped = false;
  let timeout;
  let controller;
  let lifecycleRevision = 0;
  let previousTabs = JSON.stringify(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS || []);
  const errorId = "tscircuit-external-tabs-error";

  const refreshExternalTabs = async () => {
    const revision = lifecycleRevision;
    const requestController = new AbortController();
    controller = requestController;
    const requestTimeout = setTimeout(() => requestController.abort(), 10000);
    try {
      const response = await fetch("/api/extra_runframe_tabs/list", {
        cache: "no-store",
        signal: requestController.signal
      });
      if (!response.ok) throw new Error("External tabs request failed");
      const payload = await response.json();
      if (!Array.isArray(payload.tabs)) throw new Error("Invalid external tabs response");
      const tabs = payload.tabs.map((tab) => ({
        tabName: tab.tab_name,
        iframeUrl: tab.iframe_url,
        ...(tab.main_component_path === undefined ? {} : { mainComponentPath: tab.main_component_path })
      }));
      clearTimeout(requestTimeout);
      if (stopped || revision !== lifecycleRevision) return;
      const serializedTabs = JSON.stringify(tabs);
      if (serializedTabs !== previousTabs) {
        window.TSCIRCUIT_EXTRA_RUNFRAME_TABS = tabs;
        window.dispatchEvent(new Event("tscircuit:extra-runframe-tabs-change"));
        previousTabs = serializedTabs;
      }
      document.getElementById(errorId)?.remove();
    } catch (error) {
      clearTimeout(requestTimeout);
      if (stopped || revision !== lifecycleRevision) return;
      if (!document.getElementById(errorId)) {
        const alert = document.createElement("div");
        alert.id = errorId;
        alert.setAttribute("role", "alert");
        alert.textContent = "External tabs could not update. The displayed pages may be out of date. Check the dev server and project configuration.";
        alert.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:2147483647;padding:12px;background:#7f1d1d;color:white;font:14px sans-serif";
        document.body.append(alert);
      }
    }
    if (!stopped && revision === lifecycleRevision) timeout = setTimeout(refreshExternalTabs, 1000);
  };

  window.addEventListener("pagehide", () => {
    stopped = true;
    lifecycleRevision++;
    clearTimeout(timeout);
    controller?.abort();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && stopped) {
      stopped = false;
      void refreshExternalTabs();
    }
  });
  void refreshExternalTabs();
}`
