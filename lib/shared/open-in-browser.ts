import { spawn } from "node:child_process"

/**
 * Open a URL in the default browser without waiting for it. Returns false if
 * the opener couldn't be started; callers should still print the URL.
 */
export const openInBrowser = (url: string): boolean => {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? // Avoids cmd.exe treating the URL's "&" as a command separator.
          ["rundll32", ["url.dll,FileProtocolHandler", url]]
        : ["xdg-open", [url]]
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true })
    child.on("error", () => {})
    child.unref()
    return true
  } catch {
    return false
  }
}

/**
 * Wrap text in an OSC 8 terminal hyperlink so it's clickable in terminals
 * that support it (iTerm2, VS Code, Windows Terminal, GNOME Terminal, ...).
 * Others ignore the escape codes and show the plain text.
 */
export const terminalLink = (url: string, text = url) =>
  `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007`
