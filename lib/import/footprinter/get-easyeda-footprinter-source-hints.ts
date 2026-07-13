const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined

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
    componentParameters?.package,
    componentParameters?.pre,
    packageDetail?.title,
    packageParameters?.package,
    packageParameters?.pre,
  ]

  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]
}
