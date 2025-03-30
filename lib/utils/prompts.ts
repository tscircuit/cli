import ogPrompts from "prompts"
import { shouldBeInteractive } from "./should-be-interactive"

export const prompts = (...args: Parameters<typeof ogPrompts>) => {
  const [promptOrPromptArray] = args
  const promptArray = Array.isArray(promptOrPromptArray)
    ? promptOrPromptArray
    : [promptOrPromptArray]

  if (!shouldBeInteractive()) {
    const result: any = {}
    promptArray.forEach((prompt) => {
      if (prompt.type === "confirm") {
        result[(prompt as any).name] = prompt.initial ?? true
        return
      }
      throw new Error(
        `Can't answer prompt without being interactive: ${JSON.stringify(prompt, null, "  ")}`,
      )
    })
    return result
  }

  return ogPrompts(...args)
}
