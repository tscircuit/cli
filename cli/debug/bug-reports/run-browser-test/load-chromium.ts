import kleur from "kleur"
import { createRequire } from "node:module"

export const loadChromium = () => {
  const require = createRequire(import.meta.url)

  try {
    const { chromium } = require("playwright")

    if (!chromium) {
      throw new Error("chromium export missing from playwright")
    }

    return chromium
  } catch (error) {
    throw new Error(
      `${kleur.red("Playwright is required for this command.")} Install it globally with 'npm i -g playwright'. Original error: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
