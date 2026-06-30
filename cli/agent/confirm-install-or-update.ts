import prompts from "prompts"

export async function confirmInstallOrUpdate(message: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false
  }

  const { confirmed } = await prompts({
    type: "confirm",
    name: "confirmed",
    message,
    initial: false,
  })

  return confirmed === true
}
