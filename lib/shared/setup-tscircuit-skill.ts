import fs from "node:fs"
import * as path from "node:path"
import kleur from "kleur"
import { prompts } from "lib/utils/prompts"

interface GitHubContent {
  name: string
  path: string
  type: "file" | "dir"
  download_url: string | null
}

const SKILL_REPO_API_URL =
  "https://api.github.com/repos/tscircuit/skill/contents"
const SKILL_INSTALL_PATHS = [
  ".claude/skills/tscircuit",
  ".agents/skills/tscircuit",
]

async function fetchGitHubContents(apiUrl: string): Promise<GitHubContent[]> {
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${apiUrl}: ${response.statusText}`)
  }
  return response.json()
}

async function fetchFileContent(downloadUrl: string): Promise<Buffer> {
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${downloadUrl}: ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function downloadDirectory(
  apiUrl: string,
  targetDir: string,
): Promise<void> {
  const contents = await fetchGitHubContents(apiUrl)

  for (const item of contents) {
    const targetPath = path.join(targetDir, item.name)

    if (item.type === "dir") {
      fs.mkdirSync(targetPath, { recursive: true })
      await downloadDirectory(`${apiUrl}/${item.name}`, targetPath)
    } else if (item.type === "file" && item.download_url) {
      const content = await fetchFileContent(item.download_url)
      fs.writeFileSync(targetPath, content)
    }
  }
}

async function downloadSkillRepo(targetDir: string): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true })

  const rootContents = await fetchGitHubContents(SKILL_REPO_API_URL)

  for (const item of rootContents) {
    if (item.name === ".git" || item.name === ".github") {
      continue
    }

    const targetPath = path.join(targetDir, item.name)

    if (item.type === "dir") {
      fs.mkdirSync(targetPath, { recursive: true })
      await downloadDirectory(`${SKILL_REPO_API_URL}/${item.name}`, targetPath)
    } else if (item.type === "file" && item.download_url) {
      const content = await fetchFileContent(item.download_url)
      fs.writeFileSync(targetPath, content)
    }
  }
}

function pathExists(filePath: string): boolean {
  return fs.lstatSync(filePath, { throwIfNoEntry: false }) !== undefined
}

function getInstallPaths(projectDir: string, update: boolean): string[] {
  const paths = [...SKILL_INSTALL_PATHS]
  // Older installers also used this location. Refresh it when present so it
  // cannot continue to shadow the updated .agents copy.
  const legacyPath = ".codex/skills/tscircuit"
  if (update && pathExists(path.join(projectDir, legacyPath))) {
    paths.push(legacyPath)
  }
  return update
    ? paths
    : paths.filter(
        (skillPath) =>
          !fs.existsSync(path.join(projectDir, skillPath, "SKILL.md")),
      )
}

function logAlreadyInstalled() {
  console.log(
    "TSCircuit AI skills already exist. Run `tsci setup skills --update` " +
      "to refresh them (add --global for home-directory installs).",
  )
}

export async function installTscircuitSkill(
  projectDir: string,
  { update = false }: { update?: boolean } = {},
): Promise<void> {
  const installPaths = getInstallPaths(projectDir, update)
  if (installPaths.length === 0) {
    logAlreadyInstalled()
    return
  }

  const updatesDir = path.join(projectDir, ".tscircuit", "skill-updates")
  fs.mkdirSync(updatesDir, { recursive: true })
  const stagingDir = fs.mkdtempSync(path.join(updatesDir, "update-"))
  const downloadDir = path.join(stagingDir, "download")
  const backupsDir = path.join(stagingDir, "backups")
  const replacementsDir = path.join(stagingDir, "replacements")
  const applied: Array<{
    targetDir: string
    backupDir?: string
    installed: boolean
  }> = []

  try {
    // Complete the download and prepare every replacement before moving any
    // installed files. A failed request must not leave a partial installation.
    await downloadSkillRepo(downloadDir)
    if (
      !fs
        .statSync(path.join(downloadDir, "SKILL.md"), { throwIfNoEntry: false })
        ?.isFile()
    ) {
      throw new Error("Downloaded skill repository does not contain SKILL.md")
    }
    for (const skillPath of installPaths) {
      fs.cpSync(downloadDir, path.join(replacementsDir, skillPath), {
        recursive: true,
      })
    }

    for (const skillPath of installPaths) {
      const targetDir = path.join(projectDir, skillPath)
      fs.mkdirSync(path.dirname(targetDir), { recursive: true })
      const backupDir = pathExists(targetDir)
        ? path.join(backupsDir, skillPath)
        : undefined
      if (backupDir) {
        fs.mkdirSync(path.dirname(backupDir), { recursive: true })
        fs.renameSync(targetDir, backupDir)
      }
      const entry = { targetDir, backupDir, installed: false }
      applied.push(entry)
      fs.renameSync(path.join(replacementsDir, skillPath), targetDir)
      entry.installed = true
    }
  } catch (error) {
    const rollbackErrors: unknown[] = []
    for (const entry of applied.reverse()) {
      try {
        if (entry.installed) fs.rmSync(entry.targetDir, { recursive: true })
        if (entry.backupDir) fs.renameSync(entry.backupDir, entry.targetDir)
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError)
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        `Skill update failed and could not be fully restored. Backups: ${backupsDir}`,
      )
    }
    throw error
  } finally {
    fs.rmSync(downloadDir, { recursive: true, force: true })
    fs.rmSync(replacementsDir, { recursive: true, force: true })
    // Keep backups outside the skill discovery directories. Never delete an
    // original installation left here after a failed rollback.
    if (
      !applied.some((entry) => entry.backupDir && pathExists(entry.backupDir))
    ) {
      fs.rmSync(stagingDir, { recursive: true, force: true })
    }
  }

  for (const skillPath of installPaths) {
    console.info(
      `tscircuit skill ${update ? "updated" : "installed"} at ${path.join(projectDir, skillPath)}`,
    )
  }
  if (applied.some((entry) => entry.backupDir)) {
    console.info(
      `Previous skill files, including local edits, saved at ${backupsDir}`,
    )
  }
}

export async function setupTscircuitSkill(
  projectDir: string,
  skipPrompt = false,
): Promise<boolean> {
  if (getInstallPaths(projectDir, false).length === 0) {
    logAlreadyInstalled()
    return true
  }

  if (!skipPrompt) {
    const { setupSkill } = await prompts({
      type: "confirm",
      name: "setupSkill",
      message:
        "Would you like to set up tscircuit AI skills for enhanced AI assistance?",
      initial: true,
    })
    if (!setupSkill) {
      console.log("Skipping tscircuit skill setup.")
      return false
    }
  }

  console.info("Setting up tscircuit AI skills...")
  try {
    await installTscircuitSkill(projectDir)
    return true
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    console.warn(
      kleur.yellow(`Failed to set up tscircuit skill: ${errorMessage}`),
    )
    console.warn("Continuing with initialization...")
    return false
  }
}
