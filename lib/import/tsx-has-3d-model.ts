/**
 * Whether an imported component will render a 3D model.
 *
 * A chip gets a 3D model from its `cadModel` prop, or, when it has none, from a
 * footprinter string footprint (core generates the model procedurally). An
 * exact `<footprint>` element with no `cadModel` has no 3D model.
 */
export const tsxHas3dModel = (tsx: string) =>
  /\bcadModel=/.test(tsx) || /\bfootprint=["']/.test(tsx)
