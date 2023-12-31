import { CliArgs } from "./parse-args"

export type AppContext = {
  args: CliArgs
  cmd: string[]
  params: Record<string, any>
  registry_url: string
}
