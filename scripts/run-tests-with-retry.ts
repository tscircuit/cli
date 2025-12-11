#!/usr/bin/env bun

import { basename } from "node:path"

/**
 * Run bun tests with smart retry logic
 * Only retries the specific test files that failed, up to 3 attempts
 *
 * Usage: bun run scripts/run-tests-with-retry.ts [--timeout <ms>] [--max-retries <n>] <test_file1> [test_file2] ...
 * Example: bun run scripts/run-tests-with-retry.ts --timeout 30000 tests/cli/add/*.test.ts
 */

interface Config {
  timeout: number
  maxRetries: number
  maxSegfaultRetries: number
  testFiles: string[]
}

function parseArgs(): Config {
  const args = process.argv.slice(2)
  const config: Config = {
    timeout: 30000,
    maxRetries: 3,
    maxSegfaultRetries: 4,
    testFiles: [],
  }

  let i = 0
  while (i < args.length) {
    if (args[i] === "--timeout" && args[i + 1]) {
      config.timeout = parseInt(args[i + 1], 10)
      i += 2
    } else if (args[i] === "--max-retries" && args[i + 1]) {
      config.maxRetries = parseInt(args[i + 1], 10)
      i += 2
    } else {
      config.testFiles.push(args[i])
      i++
    }
  }

  return config
}

interface RunResult {
  exitCode: number
  output: string
}

async function runTests(files: string[], timeout: number): Promise<RunResult> {
  const proc = Bun.spawn(
    ["bun", "test", ...files, "--timeout", String(timeout)],
    {
      stdout: "pipe",
      stderr: "pipe",
      env: process.env,
    },
  )

  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  // Stream output to console while capturing it
  const stdoutReader = proc.stdout.getReader()
  const stderrReader = proc.stderr.getReader()

  const readStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    chunks: string[],
    writeFn: (chunk: string) => void,
  ) => {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = new TextDecoder().decode(value)
      writeFn(chunk)
      chunks.push(chunk)
    }
  }

  await Promise.all([
    readStream(stdoutReader, stdoutChunks, (chunk) =>
      process.stdout.write(chunk),
    ),
    readStream(stderrReader, stderrChunks, (chunk) =>
      process.stderr.write(chunk),
    ),
    proc.exited,
  ])

  const exitCode = proc.exitCode ?? 1
  const output = stdoutChunks.join("") + stderrChunks.join("")

  return { exitCode, output }
}

async function runTestsWithSegfaultRetry(
  files: string[],
  timeout: number,
  maxSegfaultRetries: number,
): Promise<RunResult> {
  let attempt = 1

  while (attempt <= maxSegfaultRetries) {
    const result = await runTests(files, timeout)

    if (result.exitCode === 0) {
      return result
    }

    // Retry on segfault (139) or illegal instruction (132)
    if (result.exitCode === 139 || result.exitCode === 132) {
      if (attempt === maxSegfaultRetries) {
        console.log(
          `Segmentation fault or illegal instruction after ${attempt} attempts (exit=${result.exitCode}).`,
        )
        return result
      }
      attempt++
      console.log(
        `Segfault (139) or illegal instruction (132) detected, retrying (${attempt}/${maxSegfaultRetries})...`,
      )
      continue
    }

    // Return for other failures
    return result
  }

  // Should not reach here, but just in case
  return { exitCode: 1, output: "" }
}

function getFailedTestFiles(output: string, allFiles: string[]): string[] {
  const failedFiles: string[] = []

  // Bun test output shows failed tests with "(fail)" marker
  // Look for test files that appear in failure context
  for (const testFile of allFiles) {
    // Get just the filename for matching (works on both Windows and Unix)
    const filename = basename(testFile)

    // Check if this file appears near a failure indicator
    if (output.includes(filename)) {
      // Look for failure patterns near the filename
      const lines = output.split("\n")
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(filename)) {
          // Check surrounding lines for failure indicators
          const context = lines.slice(Math.max(0, i - 2), i + 3).join("\n")
          if (/fail|\(fail\)|error|✗|timed out/i.test(context)) {
            failedFiles.push(testFile)
            break
          }
        }
      }
    }
  }

  return failedFiles
}

async function main() {
  const config = parseArgs()

  if (config.testFiles.length === 0) {
    console.error("ERROR: No test files provided")
    console.error(
      "Usage: bun run scripts/run-tests-with-retry.ts [--timeout <ms>] [--max-retries <n>] <test_file1> [test_file2] ...",
    )
    process.exit(1)
  }

  console.log(
    `Running ${config.testFiles.length} test file(s) with timeout=${config.timeout}ms, max_retries=${config.maxRetries}`,
  )

  // Run initial test
  let result = await runTestsWithSegfaultRetry(
    config.testFiles,
    config.timeout,
    config.maxSegfaultRetries,
  )

  if (result.exitCode === 0) {
    console.log("✓ All tests passed!")
    process.exit(0)
  }

  // Exit if segfault (already retried)
  if (result.exitCode === 139 || result.exitCode === 132) {
    process.exit(result.exitCode)
  }

  // Identify failed tests
  console.log("")
  console.log("================================")
  console.log("Some tests failed. Identifying failed tests for retry...")
  console.log("================================")

  let failedFiles = getFailedTestFiles(result.output, config.testFiles)

  if (failedFiles.length === 0) {
    console.log("Could not identify specific failed tests from output.")
    console.log(`Test run failed with exit code ${result.exitCode}`)
    process.exit(result.exitCode)
  }

  console.log(`Identified ${failedFiles.length} failed test file(s):`)
  for (const file of failedFiles) {
    console.log(`  - ${file}`)
  }

  // Retrying only the failed tests
  for (let retry = 1; retry <= config.maxRetries; retry++) {
    console.log("")
    console.log(
      `--- Retry attempt ${retry}/${config.maxRetries} for failed tests ---`,
    )

    result = await runTestsWithSegfaultRetry(
      failedFiles,
      config.timeout,
      config.maxSegfaultRetries,
    )

    if (result.exitCode === 0) {
      console.log(`✓ All tests passed on retry attempt ${retry}!`)
      process.exit(0)
    }

    // Exit on segfault (already retried internally)
    if (result.exitCode === 139 || result.exitCode === 132) {
      process.exit(result.exitCode)
    }

    // Update failed files for next retry (in case some passed)
    if (retry < config.maxRetries) {
      const newFailed = getFailedTestFiles(result.output, failedFiles)
      if (newFailed.length > 0) {
        failedFiles = newFailed
        console.log(`Still failing: ${failedFiles.length} test file(s)`)
      }
    }
  }

  console.log("")
  console.log(
    `✗ Tests still failing after ${config.maxRetries} retry attempts.`,
  )
  process.exit(result.exitCode)
}

main()

export {}
