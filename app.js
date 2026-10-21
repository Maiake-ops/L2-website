/* Damped spring response converted to a CSS linear() easing. */
export function spring(stiffness, damping, samples = 48) {
  const w0 = Math.sqrt(stiffness);
  const settle = 6.9 / (damping * w0);
  const wd = damping < 1 ? w0 * Math.sqrt(1 - damping * damping) : 0;
  const x = (t) => damping < 1
    ? Math.exp(-damping * w0 * t) * (Math.cos(wd * t) + (damping * w0 / wd) * Math.sin(wd * t))
    : Math.exp(-w0 * t) * (1 + w0 * t);
  const points = Array.from({ length: samples + 1 }, (_, i) => +(1 - x((i / samples) * settle)).toFixed(4));
  points[samples] = 1;
  return { duration: Math.round(settle * 1000), easing: `linear(${points.join(", ")})` };
}

/* L2 website interactions: theme, reading progress, and copy. */
(() => {
  "use strict";

  const motion = [
    ["spatial-fast", 800, .6], ["spatial-default", 380, .8], ["spatial-slow", 200, .8],
    ["effects-fast", 3800, 1], ["effects-default", 1600, 1], ["effects-slow", 800, 1],
  ];
  for (const [name, stiffness, damping] of motion) {
    const values = spring(stiffness, damping);
    document.documentElement.style.setProperty(`--motion-${name}`, values.easing);
    document.documentElement.style.setProperty(`--motion-${name}-dur`, `${values.duration}ms`);
  }

  const bootStarted = performance.now();
  const bootAssets = document.getElementById("bootAssets");
  const bootState = document.getElementById("bootState");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  function updateThemeButton(theme) {
    if (themeMeta) themeMeta.content = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
    if (!themeToggle) return;
    const dark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeToggle.querySelector(".material-symbols-rounded").textContent = dark ? "light_mode" : "dark_mode";
  }

  let savedTheme = null;
  try { savedTheme = localStorage.getItem("l2-theme"); } catch { /* Storage may be unavailable. */ }
  if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;
  updateThemeButton(savedTheme || (systemTheme.matches ? "dark" : "light"));
  systemTheme.addEventListener("change", (event) => {
    if (!document.documentElement.dataset.theme) updateThemeButton(event.matches ? "dark" : "light");
  });
  themeToggle?.addEventListener("click", () => {
    const activeTheme = document.documentElement.dataset.theme || (systemTheme.matches ? "dark" : "light");
    const nextTheme = activeTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem("l2-theme", nextTheme); } catch { /* Theme still applies for this visit. */ }
    updateThemeButton(nextTheme);
  });
  const finishBoot = () => {
    if (bootAssets) bootAssets.textContent = "[  OK  ]";
    if (bootState) bootState.textContent = "Starting interface…";
    window.setTimeout(() => {
      if (bootState) bootState.textContent = "Ready";
      document.documentElement.classList.add("page-ready");
    }, Math.max(0, 2500 - (performance.now() - bootStarted)));
  };
  if (document.readyState === "complete") finishBoot();
  else window.addEventListener("load", finishBoot, { once: true });

  const sections = [...document.querySelectorAll(".section")];
  const progress = document.getElementById("progressBar");
  const current = document.getElementById("sectionIndex");
  const total = document.getElementById("sectionTotal");
  const topbar = document.getElementById("topbar");
  const status = document.getElementById("copyStatus");

  const pad = (n) => String(n).padStart(2, "0");
  if (total) total.textContent = pad(sections.length);

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const amount = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, amount))})`;
    topbar?.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const index = sections.indexOf(visible.target);
    if (current && index >= 0) current.textContent = pad(index + 1);
    document.querySelectorAll(".nav a").forEach((link) => {
      if (link.hash === `#${visible.target.id}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-18% 0px -58% 0px", threshold: [0, .1, .25, .5] });

  sections.forEach((section) => observer.observe(section));
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.copy);
      const value = source?.textContent.trim() || "";
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.append(helper);
        helper.select();
        try { document.execCommand("copy"); } catch { /* Clipboard unavailable. */ }
        helper.remove();
      }
      button.textContent = "Copied";
      button.classList.add("is-copied");
      if (status) status.textContent = "Command copied to clipboard.";
      window.clearTimeout(button._reset);
      button._reset = window.setTimeout(() => {
        button.textContent = "Copy";
        button.classList.remove("is-copied");
        if (status) status.textContent = "";
      }, 1600);
    });
  });
})();
