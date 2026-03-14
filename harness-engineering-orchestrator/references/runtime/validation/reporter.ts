export type ValidationReporter = {
  pass: (message: string) => void
  warn: (message: string) => void
  failSoft: (message: string, hint?: string) => void
  section: (title: string) => void
  finish: () => never
}

export function createReporter(): ValidationReporter {
  let passCount = 0
  let failCount = 0
  let warnCount = 0

  return {
    pass(message: string) {
      console.log(`  ✅ ${message}`)
      passCount++
    },
    warn(message: string) {
      console.warn(`  ⚠️  ${message}`)
      warnCount++
    },
    failSoft(message: string, hint?: string) {
      console.error(`  ❌ ${message}`)
      if (hint) console.error(`     → ${hint}`)
      failCount++
    },
    section(title: string) {
      console.log(`\n── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`)
    },
    finish(): never {
      if (failCount > 0) {
        console.error(`\n${failCount} issue(s) must be fixed. See references/gates-and-guardians.md`)
        process.exit(1)
      }

      console.log(`✅ Validation passed (${passCount} check(s)${warnCount > 0 ? `, ${warnCount} warning(s)` : ""})`)
      process.exit(0)
    },
  }
}
