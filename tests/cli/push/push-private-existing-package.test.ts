import { beforeAll, expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

let firstPush: Awaited<
  ReturnType<Awaited<ReturnType<typeof getCliTestFixture>>["runCommand"]>
>
let privatePush: typeof firstPush
let wasInitiallyPrivate: boolean | null | undefined
let isPrivateAfterPrivatePush: boolean | null | undefined

beforeAll(async () => {
  const { tmpDir, runCommand, registryDb } = await getCliTestFixture({
    loggedIn: true,
  })

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "pocket-audio-player",
      version: "0.3.4",
      description:
        "Two-layer microSD pocket audio player with OLED, buttons, USB-C programming and 3.5 mm headphones",
      main: "index.circuit.tsx",
    }),
  )
  await writeFile(
    path.join(tmpDir, "index.circuit.tsx"),
    `export default function PocketAudioPlayer() {
  return (
    <board title="Pocket Audio Player" width="50mm" height="65mm" layers={2}>
      <schematicsheet name="power"><resistor name="R1" resistance="1k" /></schematicsheet>
      <schematicsheet name="processor"><resistor name="R2" resistance="1k" /></schematicsheet>
      <schematicsheet name="audio"><resistor name="R3" resistance="1k" /></schematicsheet>
      <schematicsheet name="interface"><resistor name="R4" resistance="1k" /></schematicsheet>
    </board>
  )
}
`,
  )

  firstPush = await runCommand("tsci push index.circuit.tsx --no-compress")
  wasInitiallyPrivate = registryDb.packages.find(
    (pkg) => pkg.name === "test-user/pocket-audio-player",
  )?.is_private

  privatePush = await runCommand(
    "tsci push index.circuit.tsx --private --no-compress",
  )
  isPrivateAfterPrivatePush = registryDb.packages.find(
    (pkg) => pkg.name === "test-user/pocket-audio-player",
  )?.is_private
}, 30_000)

test("Pocket Audio Player publishes publicly before the visibility change", () => {
  expect(firstPush.exitCode).toBe(0)
  expect(firstPush.stdout).toContain("published!")
  expect(wasInitiallyPrivate).toBe(false)
  expect(privatePush.exitCode).toBe(0)
  expect(privatePush.stdout).toContain("published!")
})

test.failing(
  "push --private changes an existing Pocket Audio Player package to private",
  () => {
    expect(isPrivateAfterPrivatePush).toBe(true)
  },
)
