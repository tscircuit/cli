# RP2040/NEMA17 explosion video fixture

The real routed board is [imrishabh18/rp2040-motor-controller v1.0.48](https://tscircuit.com/imrishabh18/rp2040-motor-controller), release `bc93e130-7357-4352-a45f-c9cf65563446`. These fixtures are copied from core's `tests/assembly/fixtures/rp2040-explosion`.

`assembled.circuit.json.gz` is its 5,117-record TSX export, including 300 traces, 303 vias, 117 CAD components, a NEMA17 motor, four M3 bolts, spacers and a vented cover. `assembly.source.tsx.txt` preserves the custom TSX used to produce it (the board was supplied through its `board` prop). `models.json.gz` pins the remote OBJ/GLB bytes; `manifest.json` records their hashes. The loader only replaces model URLs with data URLs. Tests require no model downloads. The NEMA17 and M3 bolt models come from [jscad-electronics](https://github.com/tscircuit/jscad-electronics), which is [MIT licensed](https://github.com/tscircuit/jscad-electronics/blob/main/LICENSE).

The video test runs the real CLI, decodes the resulting H.264 MP4, verifies its dimensions, frame rate, frame count and duration, then compares a storyboard including an intermediate pose and every completed stage. A second test compiles new TSX with the pinned real NEMA17/M3 meshes and checks a stage that moves out and back, exercising camera fitting at intermediate move endpoints.

Regenerate the tracked video and its decoded PNG storyboards with FFmpeg on PATH:

```sh
BUN_UPDATE_SNAPSHOTS=1 bun test tests/cli/export/export-explosion-mp4.test.ts
```

Review [`rp2040-explosion.mp4`](../../cli/export/__snapshots__/rp2040-explosion.mp4) and the [stage storyboard](../../cli/export/__snapshots__/export-explosion-mp4-stages.snap.png). The cover and bolts lift together first, then the bolts, motor and spacers separate. This is a playback test, not a collision-clearance claim.
