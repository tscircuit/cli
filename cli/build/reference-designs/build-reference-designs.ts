import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { zodToJsonSchema } from "zod-to-json-schema"
import {
  referenceDesignManifestSchema,
  referenceDesignPropsSchema,
  REFERENCE_DESIGN_MANIFEST_PATH,
  type ReferenceDesignManifest,
} from "@tscircuit/runframe-reference-designs/reference-designs"
import type { PlatformConfig } from "@tscircuit/props"
import { buildFilesWithWorkerPool } from "../worker-pool"
import { EMPTY_IMAGE_FORMAT_SELECTION } from "../image-format-selection"
import {
  loadReferenceDesign,
  type ReferenceDesignDefinition,
} from "./load-reference-design"

export async function buildReferenceDesigns(request: {
  definitions: ReferenceDesignDefinition[]
  projectDir: string
  platformConfig?: PlatformConfig
  concurrency?: number
  workerJobTimeoutMs?: number
}): Promise<ReferenceDesignManifest> {
  const { definitions, projectDir } = request
  const manifestPath = path.join(projectDir, REFERENCE_DESIGN_MANIFEST_PATH)
  // A failed rebuild must never leave an old manifest advertising incomplete files.
  await fs.rm(manifestPath, { force: true })
  const stagingDir = await fs.mkdtemp(
    path.join(projectDir, ".reference-designs-"),
  )
  const manifest: ReferenceDesignManifest = {
    schema_version: 1,
    reference_designs: [],
  }
  const jobs: Parameters<typeof buildFilesWithWorkerPool>[0]["files"] = []
  try {
    for (const definition of definitions) {
      const { propsSchema, presets, presetLabels } = await loadReferenceDesign({
        definition,
        projectDir,
      })
      const configurations: ReferenceDesignManifest["reference_designs"][number]["configurations"] =
        []
      for (const [name, preset] of Object.entries(presets)) {
        const props = referenceDesignPropsSchema.parse(
          propsSchema.parse(preset),
        )
        const directory = path.join(stagingDir, definition.name, name)
        await fs.mkdir(directory, { recursive: true })
        jobs.push({
          filePath: path.resolve(projectDir, definition.componentPath),
          outputPath: path.join(directory, "circuit.json"),
          glbOutputPath: path.join(directory, "3d.glb"),
          previewOutputDir: directory,
          generatePreviewAssets: true,
          injectedProps: props,
        })
        const outputPath = `dist/reference-designs/${definition.name}/${name}`
        configurations.push({
          name,
          display_name:
            presetLabels?.[name] ??
            name[0].toUpperCase() + name.slice(1).replaceAll("_", " "),
          props,
          circuit_json_path: `${outputPath}/circuit.json`,
          pcb_svg_path: `${outputPath}/pcb.svg`,
          schematic_svg_path: `${outputPath}/schematic.svg`,
          glb_path: `${outputPath}/3d.glb`,
          circuit_json_sha256: "",
          glb_sha256: "",
        })
      }
      manifest.reference_designs.push({
        name: definition.name,
        display_name: definition.displayName,
        chip_names: definition.chipNames,
        component_path: definition.componentPath,
        props_schema: referenceDesignPropsSchema.parse(
          zodToJsonSchema(propsSchema, { target: "jsonSchema7" }),
        ),
        configurations,
      })
    }
    if (jobs.length > 0) {
      const results = await buildFilesWithWorkerPool({
        files: jobs,
        projectDir,
        concurrency: request.concurrency ?? 1,
        workerJobTimeoutMs: request.workerJobTimeoutMs,
        onLog: (lines) => {
          for (const line of lines) console.log(line)
        },
        buildOptions: {
          platformConfig: request.platformConfig,
          imageFormats: {
            ...EMPTY_IMAGE_FORMAT_SELECTION,
            pcbSvgs: true,
            schematicSvgs: true,
          },
        },
        stopOnFatal: true,
      })
      const failed = results.find(
        (result) =>
          !result.ok || result.hasErrors || !result.glbOk || !result.previewOk,
      )
      if (failed)
        throw new Error(
          `Reference design build failed: ${failed.errors.join("; ") || failed.glbError || failed.previewError || failed.filePath}`,
        )
    }
    for (const design of manifest.reference_designs) {
      for (const configuration of design.configurations) {
        const directory = path.join(stagingDir, design.name, configuration.name)
        const circuitBytes = await fs.readFile(
          path.join(directory, "circuit.json"),
        )
        const circuit: Array<{ type: string }> = JSON.parse(
          circuitBytes.toString(),
        )
        if (!circuit.some((element) => element.type === "pcb_board"))
          throw new Error(
            `${design.name}/${configuration.name}: no PCB generated`,
          )
        for (const fileName of ["pcb.svg", "schematic.svg", "3d.glb"]) {
          if (!(await fs.stat(path.join(directory, fileName))).size)
            throw new Error(`Missing artifact: ${fileName}`)
        }
        configuration.circuit_json_sha256 = createHash("sha256")
          .update(circuitBytes)
          .digest("hex")
        configuration.glb_sha256 = createHash("sha256")
          .update(await fs.readFile(path.join(directory, "3d.glb")))
          .digest("hex")
      }
    }
    const parsedManifest = referenceDesignManifestSchema.parse(manifest)
    await fs.mkdir(path.join(projectDir, "dist"), { recursive: true })
    await fs.rm(path.join(projectDir, "dist/reference-designs"), {
      recursive: true,
      force: true,
    })
    await fs.rename(stagingDir, path.join(projectDir, "dist/reference-designs"))
    await fs.writeFile(manifestPath, JSON.stringify(parsedManifest, null, 2))
    return parsedManifest
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true })
  }
}
