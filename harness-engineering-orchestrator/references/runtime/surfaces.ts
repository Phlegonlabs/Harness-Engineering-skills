import { existsSync, readdirSync } from "fs"
import type { ProjectType } from "../types"

export type AddableSurface = Exclude<ProjectType, "monorepo">

export const ADDABLE_SURFACES: AddableSurface[] = [
  "web-app",
  "ios-app",
  "android-app",
  "api",
  "mobile-cross-platform",
  "cli",
  "agent",
  "desktop",
]

export const SURFACE_LABELS: Record<ProjectType, string> = {
  "web-app": "Web App",
  "ios-app": "iOS App",
  "android-app": "Android App",
  api: "API",
  "mobile-cross-platform": "Cross-Platform Mobile",
  cli: "CLI",
  agent: "Agent Project",
  desktop: "Desktop App",
  monorepo: "Monorepo",
}

export const SURFACE_WORKSPACE_MAP: Record<AddableSurface, string> = {
  "web-app": "web",
  "ios-app": "ios",
  "android-app": "android",
  api: "api",
  "mobile-cross-platform": "mobile",
  cli: "cli",
  agent: "agent",
  desktop: "desktop",
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

export function isAddableSurface(value: string): value is AddableSurface {
  return ADDABLE_SURFACES.includes(value as AddableSurface)
}

export function normalizeProjectTypes(types: ProjectType[]): ProjectType[] {
  const surfaceTypes = Array.from(
    new Set(types.filter(type => type !== "monorepo")),
  )

  return ["monorepo", ...surfaceTypes]
}

export function workspaceForSurface(type: AddableSurface, preferred?: string): string {
  const normalized = slugify(preferred ?? "")
  return normalized || SURFACE_WORKSPACE_MAP[type]
}

export function surfaceLabel(type: ProjectType): string {
  return SURFACE_LABELS[type]
}

export function projectTypeSummary(types: ProjectType[]): string {
  return normalizeProjectTypes(types)
    .map(surfaceLabel)
    .join(" + ")
}

export function hasAgentSurface(types: ProjectType[]): boolean {
  return types.includes("agent")
}

export function surfaceWorkspaceList(types: ProjectType[]): string[] {
  if (existsSync("apps")) {
    const discovered = readdirSync("apps", { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()

    if (discovered.length > 0) {
      return discovered
    }
  }

  const surfaceTypes = normalizeProjectTypes(types).filter(
    (type): type is AddableSurface => type !== "monorepo",
  )

  if (surfaceTypes.length === 0) {
    return ["core"]
  }

  return Array.from(
    new Set(surfaceTypes.map(type => SURFACE_WORKSPACE_MAP[type])),
  )
}
