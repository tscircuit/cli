const viewToArrayBuffer = (view: ArrayBufferView): ArrayBuffer => {
  const copy = new Uint8Array(view.byteLength)
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  return copy.buffer
}

export const normalizeToUint8Array = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(viewToArrayBuffer(value as ArrayBufferView))
  }

  throw new Error(
    "Expected Uint8Array, ArrayBuffer, or ArrayBufferView for binary data",
  )
}

export const normalizeToArrayBuffer = async (
  value: unknown,
): Promise<ArrayBuffer> => {
  if (value instanceof ArrayBuffer) {
    return value
  }

  if (ArrayBuffer.isView(value)) {
    return viewToArrayBuffer(value as ArrayBufferView)
  }

  if (value && typeof value === "object") {
    const maybeArrayBufferLike = value as {
      arrayBuffer?: () => Promise<ArrayBuffer> | ArrayBuffer
    }
    if (typeof maybeArrayBufferLike.arrayBuffer === "function") {
      const result = maybeArrayBufferLike.arrayBuffer()
      return result instanceof Promise ? await result : result
    }
  }

  throw new Error(
    "Expected ArrayBuffer, ArrayBufferView, or Buffer-compatible object",
  )
}
