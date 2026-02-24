import type { PlatformConfig } from "@tscircuit/props"

export type RpcJob<Args, Result> = {
  id: string
  method: string
  args: Args
  resolve: (result: Result) => void
  reject: (error: Error) => void
}

export type RpcWorkerInputMessage = RpcCallMessage | RpcInitMessage

export type RpcWorkerOutputMessage =
  | RpcResultMessage
  | RpcLogMessage
  | RpcErrorMessage

export type RpcCallMessage = {
  message_type: "rpc_call"
  id: string
  method: string
  args: unknown
}

export type RpcInitMessage = {
  message_type: "rpc_init"
  service: string
}

export type RpcResultMessage = {
  message_type: "rpc_result"
  id: string
  result: unknown
}

export type RpcLogMessage = {
  message_type: "rpc_log"
  log_lines: string[]
}

export type RpcErrorMessage = {
  message_type: "rpc_error"
  id: string
  error: string
}

export type RpcService<
  Methods extends Record<string, (...args: any[]) => Promise<any>>,
> = {
  [K in keyof Methods]: Methods[K]
}

export type BuildServiceMethods = {
  buildFile(args: {
    filePath: string
    outputPath: string
    projectDir: string
    options?: {
      ignoreErrors?: boolean
      ignoreWarnings?: boolean
      platformConfig?: PlatformConfig
    }
  }): Promise<{
    filePath: string
    outputPath: string
    circuitJsonPath: string
    ok: boolean
    isFatalError?: { errorType: string; message: string }
    errors: string[]
    warnings: string[]
  }>
}

export type SnapshotServiceMethods = {
  snapshotFile(args: {
    filePath: string
    projectDir: string
    options?: {
      update?: boolean
      threeD?: boolean
      pcbOnly?: boolean
      schematicOnly?: boolean
      forceUpdate?: boolean
      snapshotsDirName?: string
      platformConfig?: PlatformConfig
    }
  }): Promise<{
    filePath: string
    ok: boolean
    didUpdate: boolean
    mismatches: string[]
    errors: string[]
    warnings: string[]
  }>
}

export type RpcJobInput<Methods extends RpcService<any>> = {
  method: keyof Methods & string
  args: Parameters<Methods[keyof Methods]>[0]
}

export type RpcJobResult<Methods extends RpcService<any>> = Awaited<
  ReturnType<Methods[keyof Methods]>
>

export type BuildJobResult = {
  filePath: string
  outputPath: string
  ok: boolean
  isFatalError?: { errorType: string; message: string }
  errors: string[]
  warnings: string[]
}

export type SnapshotJobResult = {
  filePath: string
  ok: boolean
  didUpdate: boolean
  mismatches: string[]
  errors: string[]
  warnings: string[]
}
