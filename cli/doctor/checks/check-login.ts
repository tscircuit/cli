import { getSessionToken } from "lib/cli-config"
import type { DoctorCheckResult } from "../types"

export const checkLoggedIn = (): DoctorCheckResult => {
  const name = "Is Logged In to tscircuit.com?"
  const token = getSessionToken()

  if (!token) {
    return {
      name,
      success: false,
      details: "No session token found. Run `tsci auth login` to authenticate.",
    }
  }

  return { name, success: true }
}
