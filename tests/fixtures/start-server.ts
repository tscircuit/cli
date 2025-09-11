import { Request as EdgeRuntimeRequest } from "@edge-runtime/primitives"
import type { Middleware } from "winterspec"
import { createDatabase } from "@tscircuit/fake-snippets"
import fakeRegistryBundle from "@tscircuit/fake-snippets/bundle"

export const startServer = async ({
  port,
  testDbName,
}: { port?: number; testDbName: string }) => {
  const db = createDatabase()

  const middleware: Middleware[] = [
    async (req: any, ctx: any, next: any) => {
      ;(ctx as any).db = db

      return next(req, ctx)
    },
  ]

  const server = Bun.serve({
    fetch: (bunReq) => {
      const req = new EdgeRuntimeRequest(bunReq.url, {
        headers: bunReq.headers,
        method: bunReq.method,
        body: bunReq.body,
      })
      return fakeRegistryBundle.makeRequest(req as any, {
        middleware,
      })
    },
    port: port ?? 0,
  })

  return {
    server: { ...server, stop: () => server.stop() },
    db,
    port: server.port,
  }
}
