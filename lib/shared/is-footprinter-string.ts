import { fp } from "@tscircuit/footprinter"

export function isFootprinterString(value: string) {
  try {
    fp.string(value).json()
    return true
  } catch {
    return false
  }
}
