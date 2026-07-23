import { expect, test } from "bun:test"
import { createHttpServer } from "lib/server/createHttpServer"
import getPort from "get-port"
import * as http from "node:http"

const listenOnRandomPort = (server: http.Server) =>
  new Promise<number>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject)
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Expected the target server to listen on a TCP port"))
        return
      }
      resolve(address.port)
    })
  })

const closeServer = (server: http.Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

test("dev proxy does not forward localhost cookies to the target", async () => {
  let targetCookie: string | undefined
  const targetServer = http.createServer((req, res) => {
    targetCookie = req.headers.cookie
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true }))
  })
  const targetPort = await listenOnRandomPort(targetServer)

  const devServerPort = await getPort()
  const { server: devServer } = await createHttpServer({
    port: devServerPort,
  })

  try {
    const syntheticPosthogCookie = encodeURIComponent(
      JSON.stringify({
        $device_id: "synthetic-device-id",
        distinct_id: "anonymous:synthetic-user",
        $initial_person_info: {
          r: "$direct",
          u: `http://localhost:${devServerPort}/`,
        },
      }),
    )

    const response = await fetch(
      `http://localhost:${devServerPort}/api/proxy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `ph_test_posthog=${syntheticPosthogCookie}`,
          "X-Target-Url": `http://127.0.0.1:${targetPort}/components/search`,
          "X-Sender-Cookie": "",
        },
        body: "wd=C2765186",
      },
    )

    expect(response.status).toBe(200)
    expect(targetCookie).toBeUndefined()
  } finally {
    await Promise.all([closeServer(devServer), closeServer(targetServer)])
  }
})
