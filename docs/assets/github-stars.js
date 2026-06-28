/* ============================================================
   GitHub star count
   ------------------------------------------------------------
   Writes the repo's current star count into any element marked
   with [data-gh-stars]. Uses the public GitHub API so the page can
   run on GitHub Pages without a backend.
   ============================================================ */

const POLL_MS = 60 * 60 * 1000;
const STARS_ENDPOINT = "https://api.github.com/repos/nolangz/data2motion";

async function refreshStars() {
  const targets = document.querySelectorAll("[data-gh-stars]");
  if (!targets.length) return;
  try {
    const res = await fetch(STARS_ENDPOINT, { headers: { Accept: "application/json" } });
    if (!res.ok) return; // keep the last good value
    const data = await res.json();
    if (typeof data.stargazers_count !== "number") return;
    const formatted = data.formatted || data.stargazers_count.toLocaleString("en-US");
    targets.forEach((el) => { if (el.textContent !== formatted) el.textContent = formatted; });
  } catch (_) {
    /* network error — keep the last value */
  }
}

refreshStars(); // on load
setInterval(() => { if (document.visibilityState === "visible") refreshStars(); }, POLL_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshStars();
});
