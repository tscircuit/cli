# Ignoring broken boards in multi-board projects

Use the optional `ignoreEntrypoints` field in `tscircuit.config.json` or
`tscircuit.config.ts` to exclude project-relative paths/glob patterns from
automatic board discovery when building all files or a directory.

Example JSON:

```json
{
  "includeBoardFiles": ["boards/**/*.board.tsx"],
  "ignoreEntrypoints": ["boards/broken.board.tsx", "boards/legacy/**/*.board.tsx"]
}
```

`tsci build` builds other matching boards without trying excluded files.
The same exclusion is applied by the shared board-discovery helpers.
Ignored entrypoints remain buildable **when explicitly passed as a file**
(`tsci build boards/broken.board.tsx`) for reproducibility/debugging.

This is a filtering option, **not** a way to ignore compile failures within
an otherwise included board. The `ignoreEntrypoints` globs are evaluated
relative to the project root and compose with `includeBoardFiles`.
