import { registerSimulate } from "cli/simulate/register"
import { Command } from "commander"

const program = new Command()
registerSimulate(program)
await program.parseAsync(process.argv)
