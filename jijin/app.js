/* Shared startpage logic for 集锦.
   Catalog comes from window.STARTPAGE_DATA.
   Local complete copy may load data.full.js first; the public site only ships data.js. */
(function (global) {
  const ENGINES = {
    library: { label: "收藏" },
    bing: { label: "必应", url: "https://www.bing.com/search?q=" },
    google: { label: "谷歌", url: "https://www.google.com/search?q=" },
    scholar: { label: "学术", url: "https://scholar.google.com/scholar?q=" },
  };

  const STORAGE_KEY = "jijin-pins";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      let path = u.pathname.replace(/\/+$/, "") || "";
      return (u.protocol + "//" + u.host.toLowerCase() + path + u.search).replace(/\/+$/, "");
    } catch (err) {
      return String(url || "").trim().replace(/\/+$/, "");
    }
  }

  function sameUrl(a, b) {
    return normalizeUrl(a) === normalizeUrl(b);
  }

  function defaultPins() {
    return (global.DEFAULT_PINS || []).map(function (p) {
      return { title: p.title, url: p.url };
    });
  }

  function loadPins() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          return arr
            .filter(function (p) { return p && p.title && p.url; })
            .map(function (p) { return { title: String(p.title), url: String(p.url) }; });
        }
      }
    } catch (err) {}
    return defaultPins();
  }

  function savePins(pins) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  }

  function shanghaiNow() {
    const now = new Date();
    const time = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const date = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
    const longDate = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now);
    const parts = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    }).formatToParts(now).forEach(function (p) {
      parts[p.type] = p.value;
    });
    const zhParts = {};
    new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "long",
    }).formatToParts(now).forEach(function (p) {
      zhParts[p.type] = p.value;
    });
    return {
      time: time,
      date: date,
      longDate: longDate,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      weekday: zhParts.weekday || "",
      monthNum: String(parseInt(parts.month, 10)),
      dayNum: String(parseInt(parts.day, 10)),
    };
  }

  function catalog() {
    const data = global.STARTPAGE_DATA;
    if (!data || !Array.isArray(data.groups)) return null;
    const byName = new Map();
    (data.collections || []).forEach(function (c) {
      byName.set(c.name, c);
    });
    const groups = data.groups.map(function (g) {
      const collections = (g.collections || []).map(function (name) {
        return byName.get(name);
      }).filter(Boolean).map(function (c) {
        const includeIntranet = !!data.includes_intranet;
        const items = (c.items || []).filter(function (it) {
          return it && it.url && it.title && (includeIntranet || !it.intranet);
        });
        return { id: c.id, name: c.name, last_updated: c.last_updated, items: items };
      });
      const count = collections.reduce(function (n, c) { return n + c.items.length; }, 0);
      return { id: g.id, name: g.name, collections: collections, count: count };
    });
    return {
      title: data.title || "集锦",
      groups: groups,
      total: groups.reduce(function (n, g) { return n + g.count; }, 0),
    };
  }

  function normalize(text) {
    return String(text || "").toLowerCase().trim();
  }

  function searchCatalog(query) {
    const cat = catalog();
    if (!cat) return [];
    const parts = normalize(query).split(/\s+/).filter(Boolean);
    if (!parts.length) return [];
    const hits = [];
    cat.groups.forEach(function (g) {
      g.collections.forEach(function (c) {
        c.items.forEach(function (it) {
          const hay = [it.title, it.host, it.note, it.url, c.name, g.name].map(normalize).join(" ");
          if (parts.every(function (p) { return hay.indexOf(p) !== -1; })) {
            hits.push({
              title: it.title,
              url: it.url,
              host: it.host || "",
              note: it.note || "",
              collection: c.name,
              group: g.name,
            });
          }
        });
      });
    });
    return hits;
  }

  function isPinned(url, pins) {
    return pins.some(function (p) { return sameUrl(p.url, url); });
  }

  const state = {
    pins: [],
    edit: false,
    engine: "library",
    query: "",
    openGroup: null,
  };

  const listeners = [];

  function emit() {
    listeners.forEach(function (fn) { fn(state); });
  }

  function setPins(next) {
    state.pins = next;
    savePins(next);
    emit();
  }

  const api = {
    ENGINES: ENGINES,
    STORAGE_KEY: STORAGE_KEY,
    state: state,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    sameUrl: sameUrl,
    shanghaiNow: shanghaiNow,
    catalog: catalog,
    searchCatalog: searchCatalog,
    isPinned: function (url) { return isPinned(url, state.pins); },

    onChange: function (fn) {
      listeners.push(fn);
    },

    setEdit: function (on) {
      state.edit = !!on;
      document.documentElement.classList.toggle("is-editing", state.edit);
      emit();
    },

    toggleEdit: function () {
      api.setEdit(!state.edit);
    },

    setEngine: function (id) {
      state.engine = ENGINES[id] ? id : "library";
      emit();
    },

    setQuery: function (q) {
      state.query = q;
      emit();
    },

    setOpenGroup: function (id) {
      state.openGroup = (state.openGroup === id) ? null : id;
      emit();
    },

    addPin: function (title, url) {
      title = String(title || "").trim();
      url = String(url || "").trim();
      if (!title || !url) return { ok: false, error: "请填写标题和网址" };
      if (!/^https?:\/\//i.test(url)) return { ok: false, error: "网址需以 http:// 或 https:// 开头" };
      if (isPinned(url, state.pins)) return { ok: false, error: "已经在常用里" };
      setPins(state.pins.concat([{ title: title, url: url }]));
      return { ok: true };
    },

    removePin: function (url) {
      setPins(state.pins.filter(function (p) { return !sameUrl(p.url, url); }));
    },

    togglePin: function (title, url) {
      if (isPinned(url, state.pins)) {
        api.removePin(url);
        return false;
      }
      const result = api.addPin(title, url);
      return result.ok;
    },

    movePin: function (index, delta) {
      const next = state.pins.slice();
      const j = index + delta;
      if (j < 0 || j >= next.length) return;
      const tmp = next[index];
      next[index] = next[j];
      next[j] = tmp;
      setPins(next);
    },

    resetPins: function () {
      setPins(defaultPins());
    },

    submitSearch: function () {
      const q = state.query.trim();
      if (!q) return;
      const engine = ENGINES[state.engine];
      if (state.engine !== "library" && engine && engine.url) {
        window.open(engine.url + encodeURIComponent(q), "_blank", "noopener,noreferrer");
      }
    },

    pinListHtml: function (options) {
      options = options || {};
      const edit = state.edit;
      return state.pins.map(function (p, i) {
        const name = escapeHtml(p.title);
        const href = escapeAttr(p.url);
        const controls = edit
          ? '<span class="pin-tools">' +
            '<button type="button" class="pin-btn" data-pin-move="-1" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">上移</button>" +
            '<button type="button" class="pin-btn" data-pin-move="1" data-i="' + i + '"' + (i === state.pins.length - 1 ? " disabled" : "") + ">下移</button>" +
            '<button type="button" class="pin-btn" data-pin-remove="' + href + '">取消</button>' +
            "</span>"
          : "";
        return (
          '<li class="pin" data-url="' + href + '">' +
            '<a class="pin-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' + name + "</a>" +
            controls +
          "</li>"
        );
      }).join("");
    },

    itemLinkHtml: function (item) {
      const href = escapeAttr(item.url);
      const title = escapeHtml(item.title);
      const host = escapeHtml(item.host || "");
      const pinned = isPinned(item.url, state.pins);
      const editBtn = state.edit
        ? '<button type="button" class="pin-btn item-pin" data-pin-toggle="' + href + '" data-pin-title="' + escapeAttr(item.title) + '">' +
          (pinned ? "取消常用" : "加入常用") +
          "</button>"
        : "";
      return (
        '<li class="item' + (pinned ? " is-pinned" : "") + '">' +
          '<a class="item-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="item-title">' + title + "</span>" +
            (host ? '<small class="item-host">' + host + "</small>" : "") +
          "</a>" +
          editBtn +
        "</li>"
      );
    },

    bindPinClicks: function (root) {
      root.addEventListener("click", function (ev) {
        const move = ev.target.closest("[data-pin-move]");
        if (move) {
          ev.preventDefault();
          api.movePin(Number(move.getAttribute("data-i")), Number(move.getAttribute("data-pin-move")));
          return;
        }
        const remove = ev.target.closest("[data-pin-remove]");
        if (remove) {
          ev.preventDefault();
          api.removePin(remove.getAttribute("data-pin-remove"));
          return;
        }
        const toggle = ev.target.closest("[data-pin-toggle]");
        if (toggle) {
          ev.preventDefault();
          api.togglePin(toggle.getAttribute("data-pin-title"), toggle.getAttribute("data-pin-toggle"));
        }
      });
    },

    startClock: function (els) {
      function tick() {
        const t = shanghaiNow();
        if (els.clock) els.clock.textContent = t.time;
        if (els.date) els.date.textContent = t.date;
        if (els.longDate) els.longDate.textContent = t.longDate;
        if (els.weekday) els.weekday.textContent = t.weekday;
        if (els.year) els.year.textContent = t.year;
        if (els.dateHuge) els.dateHuge.textContent = t.month + "." + t.day;
        if (els.monthNum) els.monthNum.textContent = t.monthNum;
        if (els.dayNum) els.dayNum.textContent = t.dayNum;
      }
      tick();
      setInterval(tick, 1000);
    },

    boot: function (opts) {
      opts = opts || {};
      state.pins = loadPins();
      state.edit = false;

      const search = opts.search;
      const form = opts.form;
      const engines = opts.engines;
      const editToggle = opts.editToggle;
      const addForm = opts.addForm;
      const addTitle = opts.addTitle;
      const addUrl = opts.addUrl;
      const addStatus = opts.addStatus;
      const resetBtn = opts.resetBtn;

      if (editToggle) {
        editToggle.addEventListener("click", function () {
          api.toggleEdit();
          editToggle.setAttribute("aria-pressed", state.edit ? "true" : "false");
          editToggle.textContent = state.edit ? "完成" : "编辑";
        });
      }

      if (engines) {
        engines.addEventListener("click", function (ev) {
          const btn = ev.target.closest("[data-engine]");
          if (!btn) return;
          api.setEngine(btn.getAttribute("data-engine"));
          engines.querySelectorAll("[data-engine]").forEach(function (b) {
            b.setAttribute("aria-selected", b === btn ? "true" : "false");
          });
        });
      }

      if (search) {
        search.addEventListener("input", function () {
          api.setQuery(search.value);
        });
        document.addEventListener("keydown", function (ev) {
          if (ev.key === "/" && ev.target !== search && ev.target.tagName !== "INPUT" && ev.target.tagName !== "TEXTAREA") {
            ev.preventDefault();
            search.focus();
          }
        });
      }

      if (form) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          if (search) api.setQuery(search.value);
          api.submitSearch();
        });
      }

      if (addForm) {
        addForm.addEventListener("submit", function (ev) {
          ev.preventDefault();
          const result = api.addPin(addTitle ? addTitle.value : "", addUrl ? addUrl.value : "");
          if (addStatus) addStatus.textContent = result.ok ? "已加入常用" : result.error;
          if (result.ok) {
            if (addTitle) addTitle.value = "";
            if (addUrl) addUrl.value = "";
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          api.resetPins();
          if (addStatus) addStatus.textContent = "已恢复默认常用名单";
        });
      }

      if (opts.root) api.bindPinClicks(opts.root);

      if (opts.render) {
        api.onChange(opts.render);
        opts.render(state);
      }
    },
  };

  global.Jijin = api;
})(window);

(function () {

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = function () { resolve(src); };
      script.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(script);
    });
  }

  function hostOf(url) {
    try { return new URL(url).hostname; } catch (err) { return ""; }
  }

  function letterOf(title, url) {
    const text = String(title || "").trim();
    if (text) return text.charAt(0);
    const host = hostOf(url);
    return host ? host.charAt(0).toUpperCase() : "#";
  }

  /* Real favicons from a public icon service. Google s2 and DuckDuckGo
     404 on several research hosts, so icon.horse is used; it returns the
     site favicon or a stand-in at HTTP 200. onerror hides a broken image
     and leaves the title letter visible. */
  function faviconSrc(host) {
    return "https://icon.horse/icon/" + encodeURIComponent(host);
  }

  function iconHtml(url, title, sizeClass, eager) {
    const letter = Jijin.escapeHtml(letterOf(title, url));
    const host = hostOf(url);
    const loading = eager ? "eager" : "lazy";
    const size = sizeClass ? "24" : "48";
    const img = host
      ? '<img class="icon-img" src="' + Jijin.escapeAttr(faviconSrc(host)) + '" alt="" width="' + size + '" height="' + size + '" loading="' + loading + '" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">'
      : "";
    return '<span class="icon' + (sizeClass ? " " + sizeClass : "") + '" aria-hidden="true">' +
      '<span class="icon-letter">' + letter + "</span>" + img +
      "</span>";
  }

  function pinItemHtml(p, i, total) {
    const href = Jijin.escapeAttr(p.url);
    const name = Jijin.escapeHtml(p.title);
    const edit = Jijin.state.edit
      ? '<span class="pin-tools">' +
        '<button type="button" class="pin-btn" data-pin-move="-1" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">上移</button>" +
        '<button type="button" class="pin-btn" data-pin-move="1" data-i="' + i + '"' + (i === total - 1 ? " disabled" : "") + ">下移</button>" +
        '<button type="button" class="pin-btn" data-pin-remove="' + href + '">取消</button>' +
        "</span>"
      : "";
    return (
      '<li class="pin" data-url="' + href + '">' +
        '<a class="pin-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
          iconHtml(p.url, p.title, "", true) +
          '<span class="pin-name">' + name + "</span>" +
        "</a>" +
        edit +
      "</li>"
    );
  }

  function itemHtml(item) {
    const href = Jijin.escapeAttr(item.url);
    const title = Jijin.escapeHtml(item.title);
    const host = Jijin.escapeHtml(item.host || hostOf(item.url));
    const pinned = Jijin.isPinned(item.url);
    const editBtn = Jijin.state.edit
      ? '<button type="button" class="pin-btn item-pin" data-pin-toggle="' + href + '" data-pin-title="' + Jijin.escapeAttr(item.title) + '">' +
        (pinned ? "取消常用" : "加入常用") +
        "</button>"
      : "";
    return (
      '<li class="item' + (pinned ? " is-pinned" : "") + '">' +
        '<a class="item-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
          iconHtml(item.url, item.title, "icon-sm") +
          '<span class="item-text">' +
            '<span class="item-title">' + title + "</span>" +
            (host ? '<small class="item-host">' + host + "</small>" : "") +
          "</span>" +
        "</a>" +
        editBtn +
      "</li>"
    );
  }

  function render(state) {
    const pinsEl = document.getElementById("pins");
    const groupsEl = document.getElementById("groups");
    const resultsEl = document.getElementById("results");
    const statusEl = document.getElementById("status");
    const pins = state.pins;
    pinsEl.innerHTML = pins.map(function (p, i) { return pinItemHtml(p, i, pins.length); }).join("");

    const cat = Jijin.catalog();
    if (!cat) {
      statusEl.textContent = "未能载入收藏目录。";
      return;
    }

    if (state.engine === "library" && state.query.trim()) {
      const hits = Jijin.searchCatalog(state.query);
      const shown = hits.slice(0, 80);
      resultsEl.innerHTML =
        '<p class="result-count">找到 ' + hits.length + " 条" + (hits.length > 80 ? "，先显示 80 条" : "") + "</p>" +
        '<ul class="item-list">' + shown.map(itemHtml).join("") + "</ul>";
      groupsEl.hidden = true;
      statusEl.textContent = "";
      return;
    }

    resultsEl.innerHTML = "";
    groupsEl.hidden = false;
    groupsEl.innerHTML = cat.groups.map(function (g) {
      const body = g.collections.map(function (c) {
        return '<h3 class="col-name">' + Jijin.escapeHtml(c.name) + "  " + c.items.length + "</h3>" +
          '<ul class="item-list">' + c.items.map(itemHtml).join("") + "</ul>";
      }).join("");
      return (
        '<details class="cat"' + (state.openGroup === g.id ? " open" : "") + ' data-group="' + g.id + '">' +
          "<summary>" + Jijin.escapeHtml(g.name) + "</summary>" +
          '<div class="cat-body">' + body + "</div>" +
        "</details>"
      );
    }).join("");
    const data = window.STARTPAGE_DATA || {};
    const kind = data.includes_intranet ? "条收藏" : "条公开收藏";
    statusEl.textContent = "共 " + cat.total + " " + kind + "。不常用的在分类里展开。";
  }

  function startPage() {
    const groupsEl = document.getElementById("groups");
    groupsEl.addEventListener("toggle", function (ev) {
      const d = ev.target.closest("details.cat");
      if (!d) return;
      if (d.open) {
        groupsEl.querySelectorAll("details.cat").forEach(function (other) {
          if (other !== d) other.open = false;
        });
        Jijin.state.openGroup = d.getAttribute("data-group");
      } else if (Jijin.state.openGroup === d.getAttribute("data-group")) {
        Jijin.state.openGroup = null;
      }
    }, true);

    Jijin.startClock({ clock: document.getElementById("clock"), date: document.getElementById("date") });
    Jijin.boot({
      root: document.body,
      search: document.getElementById("search"),
      form: document.getElementById("search-form"),
      engines: document.getElementById("engines"),
      editToggle: document.getElementById("edit-toggle"),
      addForm: document.getElementById("add-form"),
      addTitle: document.getElementById("add-title"),
      addUrl: document.getElementById("add-url"),
      addStatus: document.getElementById("add-status"),
      resetBtn: document.getElementById("reset-pins"),
      render: render
    });
  }

  loadScript("data.full.js").catch(function () {
    return loadScript("data.js");
  }).then(startPage).catch(function () {
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.textContent = "未能载入收藏目录。";
  });

})();
