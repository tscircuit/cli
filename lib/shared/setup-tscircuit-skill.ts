import * as fs from "node:fs"
import * as path from "node:path"
import { prompts } from "lib/utils/prompts"
import kleur from "kleur"

interface GitHubContent {
  name: string
  path: string
  type: "file" | "dir"
  download_url: string | null
}

const SKILL_REPO_API_URL =
  "https://api.github.com/repos/tscircuit/skill/contents"
const SKILL_DIR_NAME = ".claude/skills/tscircuit"

async function fetchGitHubContents(apiUrl: string): Promise<GitHubContent[]> {
  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${apiUrl}: ${response.statusText}`)
  }
  return response.json()
}

async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${downloadUrl}: ${response.statusText}`)
  }
  return response.text()
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
      fs.writeFileSync(targetPath, content, "utf-8")
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
      fs.writeFileSync(targetPath, content, "utf-8")
    }
  }
}

export async function setupTscircuitSkill(
  projectDir: string,
  skipPrompt = false,
): Promise<boolean> {
  const skillDir = path.join(projectDir, SKILL_DIR_NAME)

  if (fs.existsSync(path.join(skillDir, "SKILL.md"))) {
    console.log("Claude skill already exists, skipping...")
    return true
  }

  if (!skipPrompt) {
    const { setupSkill } = await prompts({
      type: "confirm",
      name: "setupSkill",
      message:
        "Would you like to set up tscircuit AI skill for enhanced AI assistance?",
      initial: true,
    })

    if (!setupSkill) {
      console.log("Skipping tscircuit skill setup.")
      return false
    }
  }

  console.info("Setting up tscircuit skill...")

  try {
    await downloadSkillRepo(skillDir)
    console.info(`tscircuit skill installed at ${SKILL_DIR_NAME}`)
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
