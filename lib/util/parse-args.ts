import minimist from "minimist"
import _ from "lodash"

export type CliArgs = {
  cmd: string[]
  yes?: boolean
  help?: boolean
}

export const parseArgs = (process_args: any): CliArgs => {
  minimist(process_args)
  const cmd = args._
}
