export interface ImportedCadComponent {
  model_obj_url?: string
  model_origin_position?: { x: number; y: number; z: number }
  model_step_url?: string
  rotation?: { z?: number }
}

export const addCadModelToTsx = (
  tsx: string,
  cadModel: { objUrl?: string; stepUrl?: string },
  cadComponent: ImportedCadComponent,
) => {
  if (tsx.includes("cadModel={{") || (!cadModel.objUrl && !cadModel.stepUrl)) {
    return tsx
  }

  const cadModelLines = [
    cadModel.objUrl ? `        objUrl: ${cadModel.objUrl},` : undefined,
    cadModel.stepUrl ? `        stepUrl: ${cadModel.stepUrl},` : undefined,
    `        pcbRotationOffset: ${cadComponent.rotation?.z ?? 0},`,
    cadComponent.model_origin_position
      ? `        modelOriginPosition: ${JSON.stringify(cadComponent.model_origin_position)},`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n")

  const propsSpreadPattern = /^(\s*)\{\.\.\.(props|restProps)\}/m
  if (!propsSpreadPattern.test(tsx)) return tsx

  return tsx.replace(
    propsSpreadPattern,
    (_, indentation: string, propsName: string) =>
      `${indentation}cadModel={{\n${cadModelLines}\n${indentation}}}\n${indentation}{...${propsName}}`,
  )
}
