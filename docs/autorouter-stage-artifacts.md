# Multiple native stages must retain their diagnostics

Two stages of the same phase currently write the same input, output and routed
image filenames. The second stage overwrites the evidence needed to understand
the first. This reproduction uses generated native Core events from a cached
synthetic prefix and a native follow-up; it contains no AM3352 capture.

![Successfully routed native control](native-two-stage-control.png)

The regression requires separate stage inputs, outputs and images with their
original contents. The stacked fix uses the existing zero-based native stage
index only when the event declares multiple stages. Single-stage filenames
remain compatible. The benchmark measures retained files, exact input hashes,
final-image hashes and timing on identical generated events.
