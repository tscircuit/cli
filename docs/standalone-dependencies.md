# Standalone dependency installation

When `TSCIRCUIT_STANDALONE=1`, init/install/add use a release-prepared ZIP at
`TSCIRCUIT_DEPENDENCY_BUNDLE`. They never invoke a package manager, resolve a
registry URL, run lifecycle scripts, or fall back to public networking.
The normal CLI installation path is unchanged.

`tsci init` pins the bundle's starter dependencies and installs them locally.
`--no-install` only writes project files; the bundle is still required to obtain
those versions. `tsci install` restores the release's complete dependency tree.
`tsci install <package>` and `tsci add <package>` accept only names and version
ranges satisfied by the bundle, and record the exact version. Existing `latest`
requirements mean the shipped version. URL/Git/file specs, workspaces, overrides,
and resolutions fail locally. This first backend installs the complete tree,
including dependencies not explicitly requested by the project.

All declared dependencies must be in the bundle. An existing `node_modules`
not created by this backend is rejected and left unchanged. Move it aside
explicitly to adopt standalone. A managed tree is generated output: reinstall
replaces it, including local edits or files added inside it. The project manifest
is validated before extraction. Staging, per-file SHA-256 checks, an install lock,
and rollback protect against a corrupt bundle or an ordinary installation error.
A machine/process crash during the final directory swap is not transactional;
rerunning `tsci install` restores the tree. An interrupted staging directory may
need to be removed manually.

The ZIP contains `manifest.json`, `bun.lock` (release resolution evidence), and
regular files below `node_modules/`. Manifest format 1 is:

```ts
{
  format: 1
  starter: Record<string, string> // exact starter versions
  packages: Record<string, string> // installed top-level package versions
  files: Record<string, { sha256: string; executable?: boolean }>
  links: Record<string, string> // relative .bin symlink targets
}
```

Manifest file/link paths are relative to `node_modules`. Links must target regular
bundled files and cannot escape that tree. Windows receives executable shims
instead of privileged file symlinks. File hashes detect corruption; authenticity
comes from the signed standalone distribution, not from hashes within the ZIP.

The standalone runtime already supplies the circuit engine. The installed tree
also supports editor types and tools, but invoking a package's Node executable
(such as `tsc`) still requires Node. This change does not intercept a separately
installed Bun/npm or guarantee offline behavior for other CLI commands.

Tests cover source-CLI init/install with an empty PATH and a fetch recorder,
standard init compatibility, restoration, missing versions, corrupt files, and
unmanaged directories. Release qualification must additionally exercise the
compiled binary, monitor DNS/socket attempts, and run native Windows/macOS/Linux
checks; a fetch recorder alone cannot establish absence of all network traffic.
