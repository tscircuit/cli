import { afterEach } from "bun:test"
import { registerKicadLoader } from "../../lib/kicad/kicad-loader-plugin"

// Register KiCad loader plugin for automatic .kicad_mod conversion
registerKicadLoader()

declare global {
  // Add the property to the globalThis type
  // eslint-disable-next-line no-var
  var deferredCleanupFns: Array<() => Promise<void>>
}

if (!globalThis.deferredCleanupFns) {
  globalThis.deferredCleanupFns = []
}

afterEach(async () => {
  for (const fn of globalThis.deferredCleanupFns) {
    await fn()
  }
  globalThis.deferredCleanupFns = []
})
