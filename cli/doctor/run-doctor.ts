import kleur from "kleur"
import { checkLoggedIn } from "./checks/check-login"
import { checkGlobalNpmrcRegistry } from "./checks/check-npmrc-registry"
import type { DoctorCheckResult } from "./types"

const formatResult = (result: DoctorCheckResult) => {
  const icon = result.success ? kleur.green("☑") : kleur.red("✗")
  console.log(`${icon} ${result.name}`)
  if (!result.success && result.details) {
    console.log(kleur.red(`  ↳ ${result.details}`))
  }
}

export const runDoctor = async () => {
  const results: DoctorCheckResult[] = []

  results.push(checkLoggedIn())
  results.push(await checkGlobalNpmrcRegistry())

  console.log(kleur.bold("\nDoctor checks:"))
  results.forEach(formatResult)

  const failed = results.filter((result) => !result.success)
  if (failed.length > 0) {
    process.exitCode = 1
  }
}
