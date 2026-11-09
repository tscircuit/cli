export interface ExplosionVideoOptions {
  fps: number
  width: number
  height: number
  stageDuration: number
  holdDuration: number
}

export const resolveExplosionVideoOptions = (
  input: Partial<Record<keyof ExplosionVideoOptions, number | string>> = {},
): ExplosionVideoOptions => {
  const options = {
    fps: Number(input.fps ?? 24),
    width: Number(input.width ?? 960),
    height: Number(input.height ?? 720),
    stageDuration: Number(input.stageDuration ?? 1),
    holdDuration: Number(input.holdDuration ?? 0.5),
  }
  for (const key of ["width", "height"] as const) {
    if (
      !Number.isInteger(options[key]) ||
      options[key] < 128 ||
      options[key] > 3840 ||
      options[key] % 2 !== 0
    ) {
      throw new Error(`--${key} must be an even integer from 128 to 3840`)
    }
  }
  if (!Number.isInteger(options.fps) || options.fps < 1 || options.fps > 60)
    throw new Error("--fps must be an integer from 1 to 60")
  if (
    !Number.isFinite(options.stageDuration) ||
    options.stageDuration <= 0 ||
    options.stageDuration > 60
  )
    throw new Error(
      "--stage-duration must be greater than 0 and at most 60 seconds",
    )
  if (
    !Number.isFinite(options.holdDuration) ||
    options.holdDuration < 0 ||
    options.holdDuration > 60
  )
    throw new Error("--hold-duration must be between 0 and 60 seconds")
  return options
}
