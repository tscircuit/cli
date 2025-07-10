export const abbreviateStringifyObject = (obj: any) => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== "object") return obj
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(obj).map(([k, v]): [string, any] => {
        return [
          k,
          typeof v === "string"
            ? v.slice(0, 100)
            : typeof v === "object" && v !== null
              ? abbreviateStringifyObject(v)
              : v,
        ]
      }),
    ),
  )
}
