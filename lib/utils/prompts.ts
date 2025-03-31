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
      } else if (prompt.initial) {
        result[(prompt as any).name] = prompt.initial
        return
      } else if (
        prompt.type === "select" &&
        prompt.choices &&
        Array.isArray(prompt.choices)
      ) {
        const selectedChoice = prompt.choices.find((c) => c.selected)
        if (!selectedChoice) {
          throw new Error(
            `No default/selected choice found for prompt: ${JSON.stringify(prompt, null, "  ")}. Cannot execute non-interactively`,
          )
        }
        result[(prompt as any).name] = selectedChoice.value!
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

export default prompts
