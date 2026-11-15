(function () {
  const ENGINES = {
    bing: { label: "必应", url: "https://www.bing.com/search?q=" },
    google: { label: "谷歌", url: "https://www.google.com/search?q=" },
    scholar: { label: "学术", url: "https://scholar.google.com/scholar?q=" },
  };

  const state = {
    data: null,
    engine: "library",
    group: "all",
    query: "",
    collectionId: null,
  };

  const $ = (id) => document.getElementById(id);
  const els = {};

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(src));
      document.head.appendChild(script);
    });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("startpage-theme", theme);
    els.theme.setAttribute("aria-label", theme === "dark" ? "切换为浅色" : "切换为深色");
  }

  function initTheme() {
    const saved = localStorage.getItem("startpage-theme");
    const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tickClock() {
    const now = new Date();
    els.clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    els.date.textContent = new Intl.DateTimeFormat("zh-CN", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function markText(title) {
    const ch = (title || "").trim().charAt(0) || "·";
    return escapeHtml(ch);
  }

  function parseHash() {
    const raw = (location.hash || "#").replace(/^#/, "").replace(/^\/+/, "");
    const parts = raw.split("/").filter(Boolean);
    state.collectionId = parts[0] === "c" && parts[1] ? parts[1] : null;
  }

  function goHome() {
    history.pushState(null, "", location.pathname + location.search);
    state.collectionId = null;
    render();
  }

  function openCollection(id) {
    history.pushState(null, "", `#/c/${id}`);
    state.collectionId = id;
    render();
    window.scrollTo(0, 0);
  }

  function collectionById(id) {
    return state.data.collections.find((item) => item.id === id);
  }

  function collectionByName(name) {
    return state.data.collections.find((item) => item.name === name);
  }

  function normalize(text) {
    return (text || "").toLowerCase().trim();
  }

  function itemMatches(item, col, query) {
    if (!query) return true;
    const hay = [item.title, item.host, item.note, item.url, col.name].map(normalize).join(" ");
    return query.split(/\s+/).every((part) => hay.includes(part));
  }

  function visibleCollections() {
    const { data, group, query } = state;
    const q = normalize(query);
    let cols = data.collections;
    if (group !== "all") {
      const names = new Set((data.groups.find((g) => g.id === group) || {}).collections || []);
      cols = cols.filter((col) => names.has(col.name));
    }
    if (!q) return cols.filter((col) => col.items.length);
    return cols
      .map((col) => ({
        ...col,
        items: col.items.filter((item) => itemMatches(item, col, q)),
      }))
      .filter((col) => col.items.length || normalize(col.name).includes(q));
  }

  function renderGroups() {
    const buttons = [
      `<button type="button" data-group="all" aria-pressed="${state.group === "all"}">全部</button>`,
    ];
    for (const group of state.data.groups) {
      buttons.push(
        `<button type="button" data-group="${escapeHtml(group.id)}" aria-pressed="${state.group === group.id}">${escapeHtml(group.name)}</button>`
      );
    }
    els.groups.innerHTML = buttons.join("");
  }

  function renderTiles(cols) {
    if (state.query.trim()) {
      const items = [];
      for (const col of cols) {
        for (const item of col.items) items.push({ col, item });
      }
      els.status.textContent = `找到 ${items.length} 条收藏`;
      els.content.innerHTML = `<div class="items">${items.map(({ col, item }) => renderItem(item, col)).join("")}</div>`;
      return;
    }

    const parts = [];
    const groups = state.group === "all"
      ? state.data.groups
      : state.data.groups.filter((g) => g.id === state.group);

    for (const group of groups) {
      const groupCols = group.collections
        .map(collectionByName)
        .filter((col) => col && col.items.length);
      if (!groupCols.length) continue;
      const count = groupCols.reduce((n, col) => n + col.items.length, 0);
      parts.push(`
        <section>
          <div class="section-head">
            <h2>${escapeHtml(group.name)}</h2>
            <span class="tile-meta">${groupCols.length} 组 · ${count} 条</span>
          </div>
          <div class="tiles">
            ${groupCols.map(renderTile).join("")}
          </div>
        </section>
      `);
    }
    const totalItems = cols.reduce((n, col) => n + col.items.length, 0);
    els.status.textContent = `${cols.filter((c) => c.items.length).length} 个分类 · ${totalItems} 条收藏`;
    els.content.innerHTML = parts.join("") || "<p class='status'>这一类里暂时没有可显示的链接。</p>";
  }

  function renderTile(col) {
    const extra = col.items.some((item) => item.intranet)
      ? `<span class="badge">含内网</span>`
      : "";
    return `
      <button type="button" class="tile" data-open="${escapeHtml(col.id)}">
        <div class="mark">${markText(col.name)}</div>
        <div class="tile-body">
          <div class="tile-title">${escapeHtml(col.name)}${extra}</div>
          <div class="tile-meta">${col.items.length} 条${col.last_updated ? " · " + escapeHtml(col.last_updated) : ""}</div>
        </div>
      </button>
    `;
  }

  function renderItem(item, col) {
    const badges = [];
    if (item.intranet) badges.push('<span class="badge">内网</span>');
    if (item.type === "video") badges.push('<span class="badge">视频</span>');
    const meta = [col && state.collectionId == null ? col.name : null, item.host || (item.type === "note" ? "笔记" : "")]
      .filter(Boolean)
      .join(" · ");
    const note = item.note ? `<div class="item-meta">${escapeHtml(item.note)}</div>` : "";
    const inner = `
      <div class="mark">${markText(item.title)}</div>
      <div class="item-body">
        <div class="item-title">${escapeHtml(item.title)}${badges.join("")}</div>
        <div class="item-meta">${escapeHtml(meta)}</div>
        ${note}
      </div>
    `;
    if (item.type === "note" || !item.url) {
      return `<article class="note">${inner}</article>`;
    }
    return `<a class="item" href="${escapeHtml(item.url)}">${inner}</a>`;
  }

  function renderCollection(col) {
    if (!col) {
      els.status.textContent = "没有找到这个分类。";
      els.content.innerHTML = `<p><a class="back" href="#" data-home="1">返回全部分类</a></p>`;
      return;
    }
    const q = normalize(state.query);
    const items = q ? col.items.filter((item) => itemMatches(item, col, q)) : col.items;
    els.status.textContent = q ? `「${col.name}」中找到 ${items.length} 条` : `${col.name} · ${items.length} 条`;
    els.content.innerHTML = `
      <div class="section-head">
        <h2>${escapeHtml(col.name)}</h2>
        <a class="back" href="#" data-home="1">返回全部分类</a>
      </div>
      <div class="items">${items.map((item) => renderItem(item, col)).join("") || "<p class='status'>没有匹配的条目。</p>"}</div>
    `;
  }

  function renderFooter() {
    if (state.data.includes_intranet) {
      els.footer.textContent = "本机完整版，含内网链接。内网地址仅在对应网络下可用。";
      return;
    }
    const n = (state.data.omitted_intranet || 0) + (state.data.omitted_private_notes || 0);
    els.footer.textContent = n
      ? `公开页已略去 ${n} 条内网或含个人密钥的链接，完整版请在本机打开。`
      : "";
  }

  function render() {
    renderGroups();
    renderFooter();
    if (state.collectionId) {
      renderCollection(collectionById(state.collectionId));
      return;
    }
    renderTiles(visibleCollections());
  }

  function currentEngine() {
    return ENGINES[state.engine] || null;
  }

  function submitSearch(event) {
    event.preventDefault();
    const query = els.search.value.trim();
    const engine = currentEngine();
    if (engine && query) {
      location.href = engine.url + encodeURIComponent(query);
    }
  }

  function bind() {
    els.theme.addEventListener("click", () => {
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });

    els.search.addEventListener("input", () => {
      state.query = els.search.value;
      render();
    });

    els.form.addEventListener("submit", submitSearch);

    document.querySelector(".engines").addEventListener("click", (event) => {
      const btn = event.target.closest("[data-engine]");
      if (!btn) return;
      state.engine = btn.dataset.engine;
      for (const item of document.querySelectorAll(".engines [data-engine]")) {
        item.setAttribute("aria-selected", item === btn ? "true" : "false");
      }
      els.search.placeholder = state.engine === "library"
        ? "搜索收藏，或选择引擎后回车检索网页"
        : `输入关键词，回车用${btn.textContent}搜索`;
      els.search.focus();
    });

    els.groups.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-group]");
      if (!btn) return;
      state.group = btn.dataset.group;
      render();
    });

    els.content.addEventListener("click", (event) => {
      const home = event.target.closest("[data-home]");
      if (home) {
        event.preventDefault();
        goHome();
        return;
      }
      const tile = event.target.closest("[data-open]");
      if (tile) openCollection(tile.dataset.open);
    });

    window.addEventListener("hashchange", () => {
      parseHash();
      render();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && document.activeElement !== els.search && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        els.search.focus();
        els.search.select();
      }
      if (event.key === "Escape") {
        if (els.search.value) {
          els.search.value = "";
          state.query = "";
          render();
        } else if (state.collectionId) {
          goHome();
        }
      }
    });
  }

  async function boot() {
    els.clock = $("clock");
    els.date = $("date");
    els.theme = $("theme");
    els.form = $("search-form");
    els.search = $("search");
    els.groups = $("groups");
    els.status = $("status");
    els.content = $("content");
    els.footer = $("footer");

    initTheme();
    tickClock();
    setInterval(tickClock, 10000);

    try {
      await loadScript("data.full.js");
    } catch (_) {
      await loadScript("data.js");
    }

    state.data = window.STARTPAGE_DATA;
    if (!state.data) {
      els.status.textContent = "没有找到收藏数据。";
      return;
    }
    parseHash();
    bind();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();