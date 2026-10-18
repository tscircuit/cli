# Extra RunFrame tabs

Set `extraRunFrameTabs` in `tscircuit.config.json` (or a runtime
`tscircuit.config.ts` / `.js`) to embed trusted HTTP(S) pages:

```json
{
  "extraRunFrameTabs": [
    {
      "tabName": "External viewer",
      "iframeUrl": "https://viewer.example/#encoded-configuration",
      "mainComponentPath": "boards/example.circuit.tsx"
    }
  ]
}
```

`mainComponentPath` scopes a tab to a project-relative circuit. Omit it to show
that tab for all circuits. Give each visible tab a distinct, non-empty name.
URLs must use HTTP(S) without embedded credentials. The embedded page must allow
iframe embedding and owns its own viewing/editing behavior.

## Live development

`tsci dev` injects the initial descriptors and checks current configuration once
per second. Changing an `iframeUrl` updates the existing frame while keeping its
tab selected. Changes do not reload the parent page; removing a selected tab
returns to an available built-in view. Requests are sequential, responses are
not cached, and navigation aborts an outstanding request. Failed configuration
reads show a visible stale-page alert while retaining the last valid tabs; a
successful refresh clears that alert. Invalid configuration also fails initial
page loading explicitly.

A separate application-specific generator can rebuild its source, create a new
viewer URL, and update `extraRunFrameTabs`. Write the JSON configuration
atomically, preserve unrelated settings, and publish only successful results.
Handle generation failures and superseded builds in that generator. The CLI
only transports tab descriptors: it does not import a private viewer, interpret
configuration payloads, generate URLs, or run vendor tools. Runtime config
modules override JSON settings using the usual project configuration precedence.

The read-only `/api/extra_runframe_tabs/list` route accepts GET and POST and
returns `{ tabs: [{ tab_name, iframe_url, main_component_path? }] }`. It exposes
only descriptors, not other project settings. Its dev-only browser client
updates `window.TSCIRCUIT_EXTRA_RUNFRAME_TABS` and dispatches
`tscircuit:extra-runframe-tabs-change`, the generic RunFrame bootstrap event.

## Static builds and rollout

`tsci build --site` embeds a fixed snapshot. Rebuild it to publish changed URLs;
there is no dev polling in a static site. `--ignore-config` omits configured tabs.

The selected browser bundle must contain RunFrame's extra-tab support. Dev
normally prefers the project's `tscircuit/browser` bundle, then the global
bundle, then the CLI bundle. Updating only CLI does not update an older
project-local browser bundle. Release RunFrame and update downstream bundles
before rolling out this feature. For local integration testing, the documented
`RUNFRAME_STANDALONE_FILE_PATH` can select a freshly built RunFrame bundle.
