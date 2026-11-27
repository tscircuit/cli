import path from "node:path"

const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  pattern: RegExp,
) => {
  let output = ""
  while (!pattern.test(output)) {
    const { value, done } = await reader.read()
    if (done) break
    output += new TextDecoder().decode(value)
  }
  return output
}

/**
 * Run `tsci auth add-provider circuithub` against the fake CircuitHub server
 * and play the browser: open the sign-in page it prints, which approves at
 * once and redirects to the CLI's local callback.
 */
export const signInToFakeCircuithub = async ({
  tmpDir,
  env,
}: {
  tmpDir: string
  env: Record<string, string | undefined>
}) => {
  const addProvider = Bun.spawn({
    cmd: [
      "bun",
      "run",
      path.resolve(process.cwd(), "cli/main.ts"),
      "auth",
      "add-provider",
      "circuithub",
    ],
    cwd: tmpDir,
    env: {
      ...process.env,
      ...env,
      CIRCUITHUB_TOKEN: "",
      CIRCUITHUB_API_KEY: "",
      TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
      FORCE_COLOR: "0",
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  globalThis.deferredCleanupFns.push(async () => {
    addProvider.kill()
  })
  const stdoutReader = addProvider.stdout.getReader()
  const prompt = await readUntil(stdoutReader, /ends up on here\.\n/)
  const authorizeUrl = prompt.match(/http:\/\/\S+\/oauth\/authorize\S+/)![0]

  // The browser: the sign-in page redirects to the CLI's local callback.
  const landed = await fetch(authorizeUrl)
  const stdout = prompt + (await readUntil(stdoutReader, /a^/))
  return {
    exitCode: await addProvider.exited,
    stdout,
    stderr: await new Response(addProvider.stderr).text(),
    authorizeUrl: new URL(authorizeUrl),
    callbackStatus: landed.status,
  }
}
