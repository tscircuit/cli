import { parentPort } from "node:worker_threads"
import { buildService } from "lib/rpc-worker/services/build-service"
import { snapshotService } from "lib/rpc-worker/services/snapshot-service"
import type {
  RpcCallMessage,
  RpcErrorMessage,
  RpcInitMessage,
  RpcLogMessage,
  RpcResultMessage,
  RpcService,
  RpcWorkerInputMessage,
  RpcWorkerOutputMessage,
} from "lib/rpc-worker/types"

if (!parentPort) {
  throw new Error("This file must be run as a worker thread")
}

const sendMessage = (message: RpcWorkerOutputMessage) => {
  parentPort!.postMessage(message)
}

const workerLog = (...args: unknown[]) => {
  const line = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ")
  const message: RpcLogMessage = {
    message_type: "rpc_log",
    log_lines: [line],
  }
  sendMessage(message)
}

let currentService: RpcService<any> | null = null

const loadService = (serviceName: string): RpcService<any> => {
  if (serviceName === "build") {
    return buildService
  }
  if (serviceName === "snapshot") {
    return snapshotService
  }
  throw new Error(`Unknown service: ${serviceName}`)
}

parentPort.on("message", async (msg: RpcWorkerInputMessage) => {
  if (msg.message_type === "rpc_init") {
    const initMsg = msg as RpcInitMessage
    workerLog(`Initializing RPC worker with service: ${initMsg.service}`)
    currentService = loadService(initMsg.service)
    workerLog(`Service ${initMsg.service} loaded successfully`)
  } else if (msg.message_type === "rpc_call") {
    const callMsg = msg as RpcCallMessage

    if (!currentService) {
      const errorMsg: RpcErrorMessage = {
        message_type: "rpc_error",
        id: callMsg.id,
        error: "Service not initialized",
      }
      sendMessage(errorMsg)
      return
    }

    const method = currentService[callMsg.method]
    if (!method) {
      const errorMsg: RpcErrorMessage = {
        message_type: "rpc_error",
        id: callMsg.id,
        error: `Method ${callMsg.method} not found on service`,
      }
      sendMessage(errorMsg)
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (method as any)(callMsg.args)
      const resultMsg: RpcResultMessage = {
        message_type: "rpc_result",
        id: callMsg.id,
        result,
      }
      sendMessage(resultMsg)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      workerLog(`Error in ${callMsg.method}: ${errorMessage}`)
      const errorMsg: RpcErrorMessage = {
        message_type: "rpc_error",
        id: callMsg.id,
        error: errorMessage,
      }
      sendMessage(errorMsg)
    }
  }
})
