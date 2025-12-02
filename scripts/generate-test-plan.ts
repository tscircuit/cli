#!/usr/bin/env bun

import { writeFileSync, mkdirSync } from "fs"
import { Glob } from "bun"

interface TestMatrix {
  nodeCount: number
  globPatterns: string[]
}

const TEST_MATRIX: TestMatrix = {
  nodeCount: 4,
  globPatterns: [
    "tests/windows/**/*.test.ts",
    "tests/cli/dev/**/*.test.ts",
    "tests/cli/export/**/*.test.ts",
    "tests/cli/install/**/*.test.ts",
    "tests/cli/auth/**/*.test.ts",
    "tests/cli/**/*.test.ts",
    "tests/test*.test.ts",
    "tests/*.test.ts",
    // Catchall pattern to distribute any remaining tests
    "tests/**/*.test.ts",
  ],
}

function getAllTestFiles(): string[] {
  const glob = new Glob("tests/**/*.test.ts")
  const allTests = Array.from(glob.scanSync({ cwd: process.cwd() }))
  return allTests.sort()
}

function generateTestPlans() {
  const allTestFiles = getAllTestFiles()
  console.log(`Found ${allTestFiles.length} total test files`)

  const claimedFiles = new Set<string>()
  const nodePlans: string[][] = Array.from(
    { length: TEST_MATRIX.nodeCount },
    () => [],
  )

  TEST_MATRIX.globPatterns.forEach((pattern, patternIdx) => {
    const glob = new Glob(pattern)
    const matchingFiles = Array.from(
      glob.scanSync({ cwd: process.cwd() }),
    ).sort()
    const unclaimedMatches = matchingFiles.filter(
      (file) => !claimedFiles.has(file),
    )

    console.log(`\nPattern ${patternIdx + 1}: ${pattern}`)
    console.log(
      `  Matched ${matchingFiles.length} files, ${unclaimedMatches.length} unclaimed`,
    )

    unclaimedMatches.forEach((file, idx) => {
      const nodeIdx = idx % TEST_MATRIX.nodeCount
      nodePlans[nodeIdx].push(file)
      claimedFiles.add(file)
    })
  })

  const unclaimedFiles = allTestFiles.filter((file) => !claimedFiles.has(file))
  if (unclaimedFiles.length > 0) {
    console.warn(
      `\n⚠️  Warning: ${unclaimedFiles.length} files were not claimed by any pattern:`,
    )
    unclaimedFiles.forEach((file) => console.warn(`  - ${file}`))
  }

  console.log(`\n📝 Writing test plans for ${TEST_MATRIX.nodeCount} nodes...`)
  mkdirSync(".github/test-plans", { recursive: true })
  for (let i = 0; i < TEST_MATRIX.nodeCount; i++) {
    const planFile = `.github/test-plans/node${i + 1}-testplan.txt`
    writeFileSync(planFile, nodePlans[i].join("\n"), "utf8")
    console.log(`  ${planFile}: ${nodePlans[i].length} tests`)
  }

  console.log(`\n✅ Test plans generated successfully!`)
  console.log(`   Total files: ${allTestFiles.length}`)
  console.log(`   Claimed: ${claimedFiles.size}`)
  console.log(`   Unclaimed: ${unclaimedFiles.length}`)
}

generateTestPlans()
