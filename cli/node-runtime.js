/** Select a Bun-compatible runtime without changing PATH or the parent environment. */
export function getNodeRuntime() {
  const configured = process.env.TSCIRCUIT_NODE_RUNTIME
  const args = JSON.parse(process.env.TSCIRCUIT_NODE_RUNTIME_ARGS || "[]")
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new Error(
      "TSCIRCUIT_NODE_RUNTIME_ARGS must be a JSON array of strings",
    )
  }
  return {
    executable: configured || "bun",
    args,
    // A compiled Bun executable can also serve as the ordinary Bun runtime.
    env: { ...process.env, ...(configured ? { BUN_BE_BUN: "1" } : {}) },
  }
}
