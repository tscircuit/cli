# Selecting the CLI runtime

`TSCIRCUIT_NODE_RUNTIME` selects a Bun-compatible executable for CLI startup and
package operations. It can be a normal Bun executable or a Bun-compiled
application such as standalone `tsci`. The CLI passes `BUN_BE_BUN=1` in the child
environment so a compiled application exposes its embedded Bun runtime.

The executable is passed directly to the process API, including paths containing
spaces. It is not a shell command. Optional `TSCIRCUIT_NODE_RUNTIME_ARGS` is a JSON
array of arguments prepended to the script or package-manager command, for example
`["--config=/path/to/bunfig.toml"]`. This allows a distribution to supply native
Bun configuration without teaching the shared CLI about its cache or install policy.

The setting takes precedence over package-manager discovery, user agents and
lockfiles. Init, install, add, remove, update, global package installation and the
doctor's Bun registry check use it. An invalid executable fails; there is no
fallback to the system package manager. Unsetting it preserves normal discovery.
Neither setting modifies PATH or installs an alias for `bun`.
