import { expect, test } from "bun:test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

type BunCommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

const runBunCommand = async (
  args: string[],
  cwd: string,
): Promise<BunCommandResult> => {
  const task = Bun.spawn(args, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  })

  const stdoutPromise = new Response(task.stdout).text()
  const stderrPromise = new Response(task.stderr).text()
  const exitCode = await task.exited
  const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise])

  return { stdout, stderr, exitCode }
}

test("producer tsconfig paths and GLB exports are preserved when linked", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const producerDir = path.join(tmpDir, "aliased-glb-lib")
  const consumerDir = path.join(tmpDir, "aliased-glb-consumer")

  await mkdir(producerDir, { recursive: true })
  await mkdir(consumerDir, { recursive: true })
  await mkdir(path.join(producerDir, "src", "components"), { recursive: true })
  await mkdir(path.join(producerDir, "assets"), { recursive: true })

  const tsconfig = {
    compilerOptions: {
      baseUrl: ".",
      jsx: "react-jsx",
      module: "esnext",
      target: "esnext",
      moduleResolution: "bundler",
      paths: {
        "@src/*": ["src/*"],
        "@assets/*": ["assets/*"],
      },
    },
  }

  const producerPkg = {
    name: "aliased-glb-lib",
    version: "1.0.0",
    main: "./dist/index.js",
    module: "./dist/index.js",
    dependencies: {
      react: "19.0.0",
    },
    exports: {
      ".": {
        import: "./dist/index.js",
        require: "./dist/index.cjs",
        types: "./dist/index.d.ts",
      },
    },
  }

  const glbBytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 0x01, 0x00, 0x00, 0x00])
  const entryPath = path.join(producerDir, "src", "board.tsx")
  const producerFiles: Record<string, string | Buffer> = {
    "tsconfig.json": JSON.stringify(tsconfig),
    "package.json": JSON.stringify(producerPkg, null, 2),
    "src/components/AliasedBoard.tsx": `import cadModelUrl from "@assets/chip.glb"

export const AliasedBoard = () => (
  <board width="15mm" height="15mm">
    <chip
      name="U1"
      footprint="soic8"
      cadModel={<cadmodel modelUrl={cadModelUrl} />}
    />
  </board>
)
`,
    "src/board.tsx": `import { AliasedBoard } from "@src/components/AliasedBoard"

export default AliasedBoard
`,
    "assets/chip.glb": glbBytes,
    "glb.d.ts": `declare module "*.glb" {
  const url: string
  export default url
}
`,
  }

  await Promise.all(
    Object.entries(producerFiles).map(([relativePath, content]) =>
      writeFile(path.join(producerDir, relativePath), content),
    ),
  )

  const producerInstall = await runBunCommand(["bun", "install"], producerDir)
  expect(producerInstall.exitCode).toBe(0)

  await runCommand(`tsci transpile ${entryPath}`)

  const esmPath = path.join(producerDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")

  expect(esmContent).toMatchInlineSnapshot(`
    "import { jsx } from 'react/jsx-runtime';
    import cadModelUrl from './assets/chip-e043b555.glb';

    const AliasedBoard = () => (jsx("board", { width: "15mm", height: "15mm", children: jsx("chip", { name: "U1", footprint: "soic8", cadModel: jsx("cadmodel", { modelUrl: cadModelUrl }) }) }));

    export { AliasedBoard as default };
    "
  `)

  const linkResult = await runBunCommand(["bun", "link"], producerDir)
  expect(linkResult.exitCode).toBe(0)

  const consumerPkg = {
    name: "aliased-glb-consumer",
    version: "1.0.0",
    dependencies: {
      react: "19.0.0",
    },
  }

  const consumerIndex = path.join(consumerDir, "index.tsx")
  const consumerFiles: Record<string, string | Buffer> = {
    "package.json": JSON.stringify(consumerPkg, null, 2),
    "index.tsx": `import AliasedBoard from "aliased-glb-lib"

export default () => <AliasedBoard />
`,
  }

  await Promise.all(
    Object.entries(consumerFiles).map(([relativePath, content]) =>
      writeFile(path.join(consumerDir, relativePath), content),
    ),
  )
  const consumerInstall = await runBunCommand(["bun", "install"], consumerDir)
  expect(consumerInstall.exitCode).toBe(0)

  const consumerLink = await runBunCommand(
    ["bun", "link", "aliased-glb-lib"],
    consumerDir,
  )
  expect(consumerLink.exitCode).toBe(0)

  const { stderr: consumerBuildStderr } = await runCommand(
    `tsci build ${consumerIndex}`,
  )
  expect(consumerBuildStderr).toBe("")

  const consumerCircuitJson = path.join(
    consumerDir,
    "dist",
    "index",
    "circuit.json",
  )
  const circuitJsonContent = await readFile(consumerCircuitJson, "utf-8")
  const consumerCircuit = JSON.parse(circuitJsonContent)
  const cadComponent = consumerCircuit.find(
    (entry: any) => entry.type === "cad_component",
  )
  const modelGlbUrl =
    cadComponent?.model_glb_url ?? cadComponent?.glb_model_url ?? undefined

  expect(modelGlbUrl).toBeDefined()
  const normalizedModelGlbUrl = String(modelGlbUrl)
    .replaceAll(tmpDir, "<tmp>")
    .replace(/\\/g, "/")

  expect(normalizedModelGlbUrl).toMatchInlineSnapshot(
    `"<tmp>/aliased-glb-lib/dist/assets/chip-e043b555.glb"`,
  )
}, 60_000)
