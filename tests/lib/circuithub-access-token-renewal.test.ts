import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { createCircuithubApi } from "lib/circuithub/circuithub-api"
import {
  getCircuithubAccessToken,
  startCircuithubSignIn,
} from "lib/circuithub/circuithub-oauth"
import { startFakeCircuithubServer } from "tests/fixtures/start-fake-circuithub-server"

const savedEnv = { ...process.env }
afterEach(() => {
  process.env = { ...savedEnv }
})

test("concurrent requests share one renewal, and a refused access token is renewed once and retried", async () => {
  const circuithub = await startFakeCircuithubServer()
  const configDir = mkdtempSync(path.join(os.tmpdir(), "circuithub-signin-"))
  process.env.TSCIRCUIT_CONFIG_DIR = configDir
  process.env.CIRCUITHUB_API_URL = circuithub.apiUrl
  process.env.CIRCUITHUB_LOGIN_URL = circuithub.loginUrl

  const session = await startCircuithubSignIn({ acceptPastedInput: false })
  await fetch(session.authorizeUrl)
  await session.done
  session.close()

  // Valid for an hour: used as is, nothing renewed.
  expect(await getCircuithubAccessToken()).toBe("cha_test_1")
  expect(circuithub.refreshCount()).toBe(0)

  // Several requests find it refused at the same time. Each refresh token
  // works once, so only one may renew it; the others wait on the lock and
  // pick up the renewed token.
  const tokens = await Promise.all(
    Array.from({ length: 5 }, () =>
      getCircuithubAccessToken({ rejected: "cha_test_1" }),
    ),
  )
  expect(new Set(tokens)).toEqual(new Set(["cha_test_2"]))
  expect(circuithub.refreshCount()).toBe(1)
  expect(circuithub.activeSignIns()).toBe(1)
  expect(existsSync(path.join(configDir, "circuithub.lock"))).toBe(false)

  // The API refuses a token CircuitHub no longer accepts (before its
  // expiry, as after a clock skew): the client renews it and retries.
  circuithub.expireAccessTokens()
  const api = createCircuithubApi({
    apiUrl: circuithub.apiUrl,
    getToken: getCircuithubAccessToken,
  })
  circuithub.requests.length = 0
  expect((await api.getProjectStatus(9001)).status).toBe("complete")
  expect(circuithub.requests.map((request) => request.authorization)).toEqual([
    "Bearer cha_test_2",
    "Bearer cha_test_3",
  ])
  expect(circuithub.refreshCount()).toBe(2)
})
