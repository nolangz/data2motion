/* ============================================================
   Lightweight i18n — English / 简体中文
   ------------------------------------------------------------
   Translates any [data-i18n] (textContent), [data-i18n-ph]
   (placeholder) and [data-i18n-aria] (aria-label). Language is
   remembered in localStorage; defaults to the browser language.
   Exposes window.t(key) and window.setLang(lang) (used by
   waitlist.js for its status messages).
   ============================================================ */
(function () {
  const DICT = {
    "nav.waitlist":  { en: "Join waitlist",      zh: "加入候补" },
    "hero.eyebrow":  { en: "AI data animation skill · commercial platform coming soon", zh: "AI 数据动效 Skill · 商业平台筹备上线" },
    "hero.lead":     {
      en: "Data2Motion turns JSON data into standalone animated chart HTML. Join the waitlist for the upcoming commercial data and logo motion platform.",
      zh: "Data2Motion 把 JSON 数据变成可独立发布的动态图表 HTML。加入候补名单，第一时间了解即将上线的数据与 Logo 商业动效平台。"
    },
    "cta.waitlist":  { en: "Join the waitlist",  zh: "加入候补名单" },
    "cta.github":    { en: "View on GitHub",     zh: "在 GitHub 查看" },

    "svc.eyebrow":   { en: "What it generates",     zh: "它能生成什么" },
    "svc.title":     { en: "Data stories, in motion.", zh: "让数据故事动起来。" },
    "svc.sub":       {
      en: "The open skill generates polished animated chart HTML from compact JSON specs. The paid commercial platform is being prepared for teams that need production-grade motion assets.",
      zh: "开源 skill 可用紧凑 JSON spec 生成高完成度动态图表 HTML。面向团队的商业平台正在筹备，适合需要生产级动效资产的场景。"
    },
    "svc.logo.title": { en: "Animated chart HTML",     zh: "动态图表 HTML" },
    "svc.logo.desc":  {
      en: "Turn KPIs, rankings, trends, and small datasets into replayable chart motion with reduced-motion and frame-seek hooks.",
      zh: "把 KPI、排名、趋势和小型数据集变成可回放动态图表，并内置 reduced-motion 与逐帧定位能力。"
    },
    "svc.logo.use":   { en: "Reports · launches · decks · dashboards", zh: "报告 · 发布 · 演示 · 仪表盘" },
    "svc.data.title": { en: "AI data storytelling", zh: "AI 数据叙事" },
    "svc.data.desc":  {
      en: "A structured workflow for taking JSON specs to standalone data visualization pages without hand-authoring SVG or animation code.",
      zh: "从 JSON spec 到独立数据可视化页面的结构化工作流，不需要手写 SVG 或动效代码。"
    },
    "svc.data.use":   { en: "JSON specs · SVG charts · standalone HTML · QA hooks", zh: "JSON spec · SVG 图表 · 独立 HTML · QA hooks" },

    "wl.title":       { en: "Join the waitlist",  zh: "加入候补名单" },
    "wl.desc":        {
      en: "The open-source skill is available now. A higher-quality paid commercial site for polished logo and data motion is being prepared; join the waitlist for launch updates.",
      zh: "开源 skill 现在就可以使用；更高品质的 Logo 与数据商业动效网站正在筹备上线。留下邮箱，上线时第一时间通知你。"
    },
    "wl.label":       { en: "Email for launch updates", zh: "接收上线通知的邮箱" },
    "wl.placeholder": { en: "you@example.com",    zh: "you@example.com" },
    "wl.button":      { en: "Notify me",          zh: "通知我" },
    "wl.note":        { en: "We'll only use your email to send Data2Motion and commercial motion launch updates.", zh: "我们只会用你的邮箱发送 Data2Motion 与商业动效平台上线通知。" },

    /* used by waitlist.js */
    "status.invalid": { en: "Please enter a valid email address.", zh: "请输入有效的邮箱地址。" },
    "status.joining": { en: "Joining…",           zh: "提交中…" },
    "status.success": { en: "You're on the list — we'll be in touch. 🔥", zh: "已加入候补名单——我们会与你联系。🔥" },
    "status.error":   { en: "Something went wrong. Please try again, or email hi@lykno.ai.", zh: "出了点问题，请重试，或邮件联系 hi@lykno.ai。" }
  };

  const SUPPORTED = ["en", "zh"];
  function detect() {
    const saved = localStorage.getItem("p2m-lang");
    if (saved && SUPPORTED.includes(saved)) return saved;
    return (navigator.language || "en").toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
  }

  let lang = detect();
  window.__lang = lang;
  window.t = (key) => (DICT[key] && (DICT[key][lang] || DICT[key].en)) || key;

  function apply() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = DICT[el.getAttribute("data-i18n")];
      if (v) el.textContent = v[lang] || v.en;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      const v = DICT[el.getAttribute("data-i18n-ph")];
      if (v) el.setAttribute("placeholder", v[lang] || v.en);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const v = DICT[el.getAttribute("data-i18n-aria")];
      if (v) el.setAttribute("aria-label", v[lang] || v.en);
    });
    const tg = document.getElementById("lang-toggle");
    if (tg) tg.textContent = lang === "en" ? "中文" : "EN"; // shows the language you switch TO
  }

  window.setLang = function (l) {
    if (!SUPPORTED.includes(l)) return;
    lang = l;
    window.__lang = l;
    localStorage.setItem("p2m-lang", l);
    apply();
    document.dispatchEvent(new CustomEvent("langchange", { detail: l }));
  };

  apply(); // script is at end of body, DOM is ready
  const tg = document.getElementById("lang-toggle");
  if (tg) tg.addEventListener("click", () => window.setLang(window.__lang === "en" ? "zh" : "en"));
})();
