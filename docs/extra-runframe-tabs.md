# Extra RunFrame tabs

Set `extraRunFrameTabs` in `tscircuit.config.json` (or a runtime
`tscircuit.config.ts` / `.js`) to embed additional HTTP or HTTPS pages in
`tsci dev` and `tsci build --site`:

```json
{
  "extraRunFrameTabs": [
    {
      "tabName": "Sysconfig",
      "iframeUrl": "https://sysconfig-viewer.tscircuit.com/#encodedcontent",
      "mainComponentPath": "boards/mspm0.circuit.tsx"
    }
  ]
}
```

Replace `encodedcontent` with a URL payload produced for the viewer. The
SysConfig viewer accepts base64-encoded gzip of its versioned UTF-8 JSON
envelope, including the source and required TI tool/product metadata; raw
`.syscfg` text alone is not that envelope. The viewer must support the target
TI SDK/device. The CLI passes the URL unchanged and does not infer a `.syscfg`
file from a circuit.

`mainComponentPath` associates a tab with a project-relative circuit file. Omit
it to display the tab for all circuits. RunFrame applies this filter as the
selected circuit changes. Give each visible tab a distinct, non-empty name.

The CLI emits `window.TSCIRCUIT_EXTRA_RUNFRAME_TABS` before the standalone bundle
loads. Reload the dev page after changing this configuration; each HTML request
loads the current project configuration, including removed tabs. Rebuild a
static site to publish config changes. `--ignore-config` omits configured tabs
from a static build. There is no automatic live update of these tabs yet.

The browser bundle must contain the matching RunFrame extra-tab support. Dev
mode normally prefers the project's installed `tscircuit/browser` bundle, then
the global tscircuit bundle, then the CLI's bundled RunFrame. Updating only the
CLI will not add tabs to an older project-local bundle. During development,
`RUNFRAME_STANDALONE_FILE_PATH` can point to a RunFrame standalone build with
the feature. Release the RunFrame change and update its downstream bundles
before relying on this configuration in production.

The embedded page controls its own view-only behavior and must permit iframe
embedding through its response headers. The CLI does not modify the page's
controls or bypass embedding restrictions.
