const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined

const getStringValues = (value: unknown): string[] => {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(getStringValues)
  if (value && typeof value === "object")
    return Object.values(value).flatMap(getStringValues)
  return []
}

export const getEasyEdaFootprinterSourceHints = (rawEasy: unknown) => {
  const component = asRecord(rawEasy)
  const dataStr = asRecord(component?.dataStr)
  const head = asRecord(dataStr?.head)
  const componentParameters = asRecord(head?.c_para)
  const packageDetail = asRecord(component?.packageDetail)
  const packageDataStr = asRecord(packageDetail?.dataStr)
  const packageHead = asRecord(packageDataStr?.head)
  const packageParameters = asRecord(packageHead?.c_para)
  const values = [
    component?.title,
    component?.description,
    component?.tags,
    component?.category,
    componentParameters?.category,
    componentParameters?.Category,
    componentParameters?.["LCSC Category"],
    componentParameters?.["JLCPCB Category"],
    componentParameters?.package,
    componentParameters?.pre,
    packageDetail?.title,
    packageParameters?.package,
    packageParameters?.pre,
  ]

  return [
    ...new Set(
      values
        .flatMap(getStringValues)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]
}
