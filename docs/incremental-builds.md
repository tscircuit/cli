# Incremental builds

Run `tsci build board.circuit.tsx --incremental` to reuse completed Circuit JSON for unchanged deterministic project inputs. Ordinary builds still render fresh. The option works with sequential and worker builds.

The first build reports a cache miss. Later matching builds report a hit, write the requested output files, and process diagnostics with the current error/warning options. A cached DRC error still causes exit code 1 unless explicitly ignored. Preview and fabrication outputs are generated normally from the reused Circuit JSON.

The cache hashes project files, including assets, environment-derived configuration, and lockfiles; effective platform options and injected props; CLI source/version; Bun/Node versions; and the resolved tscircuit/core entrypoints. Generated `dist`, `build`, `.tscircuit`, `.git`, and `node_modules` directories are excluded. Changing any project file invalidates the cached board result in this first version.

Keep build inputs inside the project or in locked, immutable dependencies. Use a fresh build for changing remote resources, files outside the project, time-dependent code, random output, or side effects. Incremental mode does not discover arbitrary runtime dependencies. It bypasses caching for linked project inputs, non-JSON platform options such as functions, and explicit solver/routing debugging or routing timeouts.

Entries are stored separately from Circuit JSON in `.tscircuit/build-cache`, checked for accidental corruption, and written atomically after a completed render with unchanged inputs. Source, footprint-loading, and unclassified errors are retried rather than cached. Missing or damaged entries are rebuilt. Remove that directory to reset this cache. Existing autorouting caches are separate.
