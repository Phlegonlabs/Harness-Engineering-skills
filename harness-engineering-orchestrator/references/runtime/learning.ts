import { dirname } from "path"
import { mkdirSync } from "fs"

export function getLearningPaths(): { codex: string; claude: string } {
  const home = Bun.env.HOME ?? Bun.env.USERPROFILE ?? ""
  const sep = process.platform === "win32" ? "\\" : "/"
  return {
    codex: `${home}${sep}.codex${sep}LEARNING.md`,
    claude: `${home}${sep}.claude${sep}LEARNING.md`,
  }
}

export async function syncLearning(content: string): Promise<void> {
  const { codex, claude } = getLearningPaths()
  mkdirSync(dirname(codex), { recursive: true })
  mkdirSync(dirname(claude), { recursive: true })
  await Bun.write(codex, content)
  await Bun.write(claude, content)
}
