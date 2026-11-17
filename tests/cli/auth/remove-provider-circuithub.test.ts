import { expect, test } from "bun:test"
import path from "node:path"
import Conf from "conf"
import * as jwt from "jsonwebtoken"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test(
  "tsci auth remove-provider circuithub forgets the saved CircuitHub login",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      env: { CIRCUITHUB_TOKEN: undefined, CIRCUITHUB_API_KEY: undefined },
    })
    // The session `tsci auth add-provider circuithub` would have saved.
    const circuithubConfig = new Conf<Record<string, string>>({
      projectName: "tscircuit",
      configName: "circuithub",
      cwd: path.join(tmpDir, ".config"),
    })
    circuithubConfig.set(
      "token",
      jwt.sign({ sub: "44738", name: "Ada Lovelace" }, "test-secret", {
        expiresIn: "24h",
      }),
    )
    circuithubConfig.set("workspace", "acme")

    const command = "tsci auth remove-provider circuithub"
    const removed = await runCommand(command)
    expect(removed.exitCode).toBe(0)
    expect(`$ ${command}\n${removed.stdout}`.trim()).toMatchInlineSnapshot(`
      "$ tsci auth remove-provider circuithub
      Removed CircuitHub (was logged in as Ada Lovelace)."
    `)
    expect(circuithubConfig.store).toEqual({})

    // Quotes now ask to add CircuitHub again.
    const quote = await runCommand(
      "tsci quote create --circuithub board.circuit.tsx --workspace acme --export-classification EAR99",
    )
    expect(quote.exitCode).toBe(1)
    expect(quote.stderr).toContain("Run `tsci auth add-provider circuithub`")

    // Removing it again is harmless.
    const again = await runCommand(command)
    expect(again.exitCode).toBe(0)
    expect(again.stdout.trim()).toMatchInlineSnapshot(
      `"CircuitHub isn't added; nothing to remove."`,
    )
  },
  { timeout: 60_000 },
)
