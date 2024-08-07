import { createFetchHandlerFromDir } from "winterspec/adapters/node"
import { Request as EdgeRuntimeRequest } from "@edge-runtime/primitives"
import { join } from "node:path"

const serverFetch = await createFetchHandlerFromDir(
  join(import.meta.dir, "../../routes"),
)

export const startServer = ({ port }: { port: number }) =>
  Bun.serve({
    fetch: (bunReq) => {
      const req = new EdgeRuntimeRequest(bunReq.url, {
        headers: bunReq.headers,
        method: bunReq.method,
        body: bunReq.body,
      })
      return serverFetch(req as any)
    },
    port,
  })
