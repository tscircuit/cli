# I-002: `tsci push` ignores configured `ignoredFiles`

**Confirmed locally on npm's latest `@tscircuit/cli`, 0.1.2408, checked 2026-10-26.** Both push transports send the excluded file's actual bytes to a loopback mock registry. Source inspection confirms the missing filter. **No live registry push was performed:** no registry credential was configured, and the registry host is outside this environment's network allowlist. Registry persistence and public publication were not tested. The CLI's “published!” messages in the logs are responses to mock success replies.

Original report: [I-002](https://github.com/AnasSarkiz/rp2040-bldc-servo-controller/blob/main/issue.md).

The existing workspace repository is `tscircuit/cli`; findings are on `repro/i-002-ignored-files`. No production source, dependencies, or `main` were modified.

## Minimal project

`repro/project/` contains only:

```text
package.json
index.circuit.tsx
tscircuit.config.json   # { "ignoredFiles": ["datasheets/**"] }
datasheets/test.txt     # harmless dummy text
```

No circuit build or dependency installation inside the fixture is needed to exercise push selection. The harness copies only these four files into a fresh temporary project for each case. Runtime dependencies and dummy authentication config stay outside the selected project.

## Reproduction commands

From this repository's root, with Node.js and npm available:

```sh
# Confirm the current latest separately; the recorded run returned 0.1.2408.
npm view @tscircuit/cli@latest version

# Download the published CLI unchanged, isolated from checkout dependencies.
mkdir -p work/i-002/runtime work/i-002/published
npm install --prefix work/i-002/runtime --no-audit --no-fund bun@1.4.4
npm pack @tscircuit/cli@0.1.2408 --pack-destination work/i-002/published
tar -xzf work/i-002/published/tscircuit-cli-0.1.2408.tgz -C work/i-002/published
npm install --prefix work/i-002/published --no-audit --no-fund --legacy-peer-deps \
  tscircuit@0.0.3016 circuit-json@0.0.535 circuit-to-svg@0.0.453 \
  @tscircuit/math-utils@0.0.36

work/i-002/runtime/node_modules/.bin/bun \
  work/i-002/published/package/dist/cli/main.js --version --verbose
node repro/run.mjs work/i-002/published/package \
  work/i-002/runtime/node_modules/.bin/bun
```

The harness invokes the unmodified published command entry module with `push` and `push --no-compress`. It supplies an isolated `TSCIRCUIT_CONFIG_DIR` containing a fake token and a loopback registry URL; it disables telemetry and update checks. The mock returns canned package/release responses and captures real HTTP upload bodies. It decompresses the archive and verifies the dummy's exact text in both transports. It never uses live credentials or invokes a push from the real project.

For the dev comparison it imports the published `DevServer` and calls its real `upsertInitialFiles()` method against that same loopback server. This tests the initial upload path, not the full browser/watch lifecycle. A second dev case removes `ignoredFiles` in its temporary copy as a positive control. Exit 0 means all four observations below were verified, including the push defect; an error/timeout fails the harness and must not be counted as a reproduction.

## Expected versus actual

| Case | Expected dummy in request | Actual |
| --- | --- | --- |
| `push` (default gzip archive) | No | **Yes, exact bytes** |
| `push --no-compress` (individual files) | No | **Yes, exact bytes** |
| Dev initial upload, configured ignore | No | No |
| Dev initial upload, ignore removed (control) | Yes | Yes |

Push selected `datasheets/test.txt`, `index.circuit.tsx`, `package.json`, and `tscircuit.config.json`. Configured dev selection contained the latter three files only. All four subprocesses exited 0. This is a local behavioral reproduction of selection and HTTP transmission, plus source confirmation; it is not a live registry reproduction.

## Responsible function and root cause

[`pushSnippet()` in `lib/shared/push-snippet.ts`](https://github.com/tscircuit/cli/blob/1be45407bed524db8abe9e6b02230d1415f61a52/lib/shared/push-snippet.ts) calls:

```ts
getPackageFilePaths(projectDir, includeDist ? [] : ["**/dist/**"])
```

It supplies only the `dist` exclusion and never merges the project's `ignoredFiles`. [`getPackageFilePaths()`](https://github.com/tscircuit/cli/blob/1be45407bed524db8abe9e6b02230d1415f61a52/lib/dev/get-package-file-paths.ts) applies built-in defaults and its caller's patterns; it does not load project config itself. `getUploadFiles()` then reads every selected file without another exclusion check. Both archive and individual uploads consume that same list, so compression does not avoid the defect.

In contrast, [`DevServer`](https://github.com/tscircuit/cli/blob/1be45407bed524db8abe9e6b02230d1415f61a52/lib/dev/DevServer.ts) loads the config and passes `this.ignoredFiles` to the helper. The glob itself works; push fails to pass it. Corresponding published-bundle evidence is at lines 377822 (push selection), 377606 (content mapping), 377521 (helper), and 377996/378162 (dev config/selection).

Suggested upstream fix, **not applied here**: load the project config from the resolved `projectDir` in `pushSnippet()` using the same supported loader as dev, then merge its patterns with the conditional `dist` exclusion:

```ts
const config = loadProjectConfig(projectDir)
const filePaths = getPackageFilePaths(projectDir, [
  ...(config?.ignoredFiles ?? []),
  ...(includeDist ? [] : ["**/dist/**"]),
])
```

Keep custom ignores effective even with `--include-dist`. An upstream regression test should assert the dummy is absent from both upload transports while a regular source file remains present, and preserve default/explicit `dist` behavior.

## Evidence and versions

- [Local execution and captured file lists](repro/evidence/local-reproduction.log).
- [Published source excerpts with line numbers](repro/evidence/published-source.txt).
- [npm package version, integrity, and peer versions](repro/evidence/package-metadata.json).
- [Verbose version output](repro/evidence/version.log) and [push help](repro/evidence/push-help.log).

Runtime: Bun 1.4.4, Node.js 24.19.0, Linux x64. `--version` alone prints the `tscircuit` version (0.0.3016); `--version --verbose` distinguishes `@tscircuit/cli` 0.1.2408. The checkout started at CLI 0.1.2237, but the behavioral tests used the separately downloaded npm 0.1.2408 distribution. The initial launch with the checkout's old peer dependencies failed before testing; the recorded reproduction uses fresh, compatible peers listed above, without patching any dependency.
