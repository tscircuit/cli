# Export an assembly explosion video

Install FFmpeg and make sure `ffmpeg` is on PATH, then run:

```sh
tsci export assembly.circuit.tsx --format explosion-mp4 -o assembly.mp4
# Previously exported Circuit JSON works too:
tsci export assembly.circuit.json --format explosion-mp4 -o assembly.mp4
```

The design must contain `assembly.explosion.stage` and `assembly.explosion.move` instructions. The CLI compiles TSX through its usual Circuit JSON build path and plays the serialized stages in order, including moves that target entire stages. It starts assembled, interpolates each stage's ordered moves, and pauses at each completed stage. PoppyGL renders the real CAD models and guide lines embedded by the glTF exporter. The camera stays fixed and fits every move endpoint, including stages that move outward and return.

| Option | Default | Meaning |
| --- | --- | --- |
| `--fps` | `24` | Integer frame rate, 1–60 |
| `--width` | `960` | Even pixel width, 128–3840 |
| `--height` | `720` | Even pixel height, 128–3840 |
| `--stage-duration` | `1` | Seconds of movement per stage, greater than zero and at most 60 |
| `--hold-duration` | `0.5` | Seconds paused at the assembled pose and after each stage, 0–60 |

Durations round to whole frames. Movement always gets at least one frame; the assembled pose also gets one frame when holds are disabled. The MP4 uses H.264/YUV420p with fast-start metadata for browser playback. FFmpeg must include the `libx264` encoder. Output defaults to `<input-stem>-explosion.mp4` beside the input. As with other exports, relative `--output` paths resolve from the input directory.

```sh
tsci export assembly.circuit.tsx -f explosion-mp4 \
  --fps 30 --width 1280 --height 720 \
  --stage-duration 2 --hold-duration 1 -o assembly.mp4
```

See the [committed RP2040/NEMA17 video](../tests/cli/export/__snapshots__/rp2040-explosion.mp4) and [test regeneration instructions](../tests/fixtures/explosion/README.md). The video illustrates the authored movements; it does not assert that they are collision-free.
