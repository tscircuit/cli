/**
 * Placeholder rendered inside #root until the standalone viewer mounts and
 * replaces it. The viewer bundle is large, so this has to read as "loading"
 * on its own, say so when the download is slow, and say so when it fails.
 */
export const loadingStateUi = `
  <div id="loader" class="loading-overlay" role="status" aria-live="polite">
    <div class="loading-container">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div id="loader-message" class="loading-message">Loading circuit viewer…</div>
      <div id="loader-detail" class="loading-detail"></div>
      <button id="loader-retry" class="loading-retry" type="button" hidden>Reload</button>
    </div>
  </div>

  <style>
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #334155;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 22em;
      padding: 0 16px;
      text-align: center;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #dbe3ec;
      border-top-color: dodgerblue;
      border-radius: 50%;
      animation: loading-spin 0.9s linear infinite;
    }

    .loading-failed .loading-spinner {
      animation: none;
      border-color: #dc2626;
    }

    .loading-message {
      font-size: 15px;
      font-weight: 500;
    }

    .loading-detail {
      font-size: 13px;
      line-height: 1.4;
      color: #64748b;
      min-height: 1.4em;
    }

    .loading-retry {
      font: inherit;
      font-size: 13px;
      padding: 6px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: inherit;
      cursor: pointer;
    }

    @keyframes loading-spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>

  <script>
    (function () {
      var startedAt = Date.now()
      var failed = false
      var get = function (id) { return document.getElementById(id) }
      var stop = function () {
        clearInterval(timer)
        window.removeEventListener("error", onResourceError, true)
      }
      var fail = function () {
        var loader = get("loader")
        if (!loader) return stop()
        failed = true
        loader.classList.add("loading-failed")
        get("loader-message").textContent = "Couldn't load the circuit viewer"
        get("loader-detail").textContent =
          "The viewer script failed to download. Check your connection and try again."
        var retry = get("loader-retry")
        retry.hidden = false
        retry.onclick = function () { location.reload() }
        stop()
      }
      // Script load failures don't bubble, so listen in the capture phase.
      var onResourceError = function (event) {
        var target = event.target
        if (target && target.tagName === "SCRIPT" && target.type === "module") fail()
      }
      var timer = setInterval(function () {
        // The viewer replaces #root's contents once it mounts.
        if (!get("loader")) return stop()
        if (failed) return
        var seconds = Math.round((Date.now() - startedAt) / 1000)
        if (seconds < 8) return
        get("loader-detail").textContent =
          "Still downloading the viewer (" + seconds + "s). It's a large file, so the first load can take a while."
      }, 1000)
      window.addEventListener("error", onResourceError, true)
    })()
  </script>
`
