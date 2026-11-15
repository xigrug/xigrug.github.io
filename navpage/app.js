/* Shared startpage logic for 收藏夹.
   Catalog comes from window.STARTPAGE_DATA.
   Local complete copy may load data.full.js first; the public site only ships data.js. */
(function (global) {
  const ENGINES = {
    library: { label: "收藏" },
    bing: { label: "必应", url: "https://www.bing.com/search?q=" },
    google: { label: "谷歌", url: "https://www.google.com/search?q=" },
    scholar: { label: "学术", url: "https://scholar.google.com/scholar?q=" },
  };

  const STORAGE_KEY = "navpage-pins";

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
      title: data.title || "收藏夹",
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
    normalizeUrl: normalizeUrl,
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

  global.Shoucang = api;
})(window);

(function () {
  const FEATURED_KEY = "navpage-featured";
  const FEATURED_LIMIT = 2;
  const ICON_DB_NAME = "navpage-icons";
  const ICON_STORE = "navpage-icons";
  const ICON_LS_KEY = "navpage-icons";

  const iconCache = new Map();

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
     and leaves the title letter visible. Custom overrides (upload or
     online URL) take precedence and fall back the same way. */
  function faviconSrc(host) {
    return "https://icon.horse/icon/" + encodeURIComponent(host);
  }

  function openIconDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("no-idb"));
        return;
      }
      const req = indexedDB.open(ICON_DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(ICON_STORE)) {
          db.createObjectStore(ICON_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function loadIconsFromLs() {
    try {
      const raw = localStorage.getItem(ICON_LS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return;
      Object.keys(obj).forEach(function (k) {
        const v = obj[k];
        if (v && v.src) iconCache.set(k, { src: String(v.src), type: v.type || "url" });
      });
    } catch (err) {}
  }

  function saveIconsToLs() {
    const obj = {};
    iconCache.forEach(function (v, k) { obj[k] = { src: v.src, type: v.type }; });
    try {
      localStorage.setItem(ICON_LS_KEY, JSON.stringify(obj));
    } catch (err) {
      const slim = {};
      iconCache.forEach(function (v, k) {
        if (v.type === "url" && v.src && v.src.indexOf("data:") !== 0) slim[k] = { src: v.src, type: v.type };
      });
      try { localStorage.setItem(ICON_LS_KEY, JSON.stringify(slim)); } catch (err2) {}
    }
  }

  function loadIcons() {
    loadIconsFromLs();
    return openIconDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(ICON_STORE, "readonly");
        const req = tx.objectStore(ICON_STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
        tx.oncomplete = function () { db.close(); };
      });
    }).then(function (records) {
      records.forEach(function (rec) {
        if (rec && rec.key && rec.src) {
          iconCache.set(rec.key, { src: rec.src, type: rec.type || "url" });
        }
      });
    }).catch(function () {
      /* localStorage already loaded */
    });
  }

  function persistIcon(key, value) {
    const idb = openIconDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(ICON_STORE, "readwrite");
        const store = tx.objectStore(ICON_STORE);
        if (value) store.put({ key: key, src: value.src, type: value.type });
        else store.delete(key);
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () {});
    saveIconsToLs();
    return idb;
  }

  function iconOverride(url) {
    return iconCache.get(Shoucang.normalizeUrl(url)) || null;
  }

  function setIconOverride(url, value) {
    const key = Shoucang.normalizeUrl(url);
    if (value && value.src) iconCache.set(key, { src: value.src, type: value.type || "url" });
    else iconCache.delete(key);
    return persistIcon(key, value && value.src ? { src: value.src, type: value.type || "url" } : null);
  }

  function exportIconSettings() {
    const icons = {};
    iconCache.forEach(function (v, k) { icons[k] = { src: v.src, type: v.type }; });
    return { version: 1, icons: icons };
  }

  function importIconSettings(data) {
    if (!data || typeof data !== "object" || !data.icons || typeof data.icons !== "object") {
      return Promise.resolve({ ok: false, error: "文件格式不正确" });
    }
    const tasks = [];
    Object.keys(data.icons).forEach(function (k) {
      const v = data.icons[k];
      if (!v || !v.src) return;
      const key = Shoucang.normalizeUrl(k);
      const rec = { src: String(v.src), type: v.type === "upload" ? "upload" : "url" };
      iconCache.set(key, rec);
      tasks.push(persistIcon(key, rec));
    });
    return Promise.all(tasks).then(function () {
      return { ok: true, count: tasks.length };
    });
  }

  function fileToPngDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error("请选择图片文件"));
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = function () {
        const max = 128;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("无法读取该图片"));
          return;
        }
        if (w >= h) {
          h = Math.max(1, Math.round(h * max / w));
          w = max;
        } else {
          w = Math.max(1, Math.round(w * max / h));
          h = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objectUrl);
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          reject(new Error("无法保存该图片"));
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("无法读取该图片"));
      };
      img.src = objectUrl;
    });
  }

  window.__navpageIconError = function (img, horse) {
    if (horse && img.dataset.fallback !== "1") {
      img.dataset.fallback = "1";
      img.src = horse;
      return;
    }
    img.hidden = true;
  };

  function iconHtml(url, title, sizeClass, eager) {
    const letter = Shoucang.escapeHtml(letterOf(title, url));
    const host = hostOf(url);
    const loading = eager ? "eager" : "lazy";
    const size = sizeClass ? "24" : "48";
    const horse = host ? faviconSrc(host) : "";
    const custom = iconOverride(url);
    const editAttr = ' data-icon-url="' + Shoucang.escapeAttr(url) + '" data-icon-title="' + Shoucang.escapeAttr(title || "") + '"';
    let img = "";
    if (custom && custom.src) {
      const onerr = horse
        ? 'window.__navpageIconError(this, \'' + String(horse).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + '\')'
        : "this.hidden=true";
      img = '<img class="icon-img" src="' + Shoucang.escapeAttr(custom.src) + '" alt="" width="' + size + '" height="' + size + '" loading="' + loading + '" decoding="async" referrerpolicy="no-referrer" onerror="' + onerr + '">';
    } else if (host) {
      img = '<img class="icon-img" src="' + Shoucang.escapeAttr(horse) + '" alt="" width="' + size + '" height="' + size + '" loading="' + loading + '" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">';
    }
    return '<span class="icon' + (sizeClass ? " " + sizeClass : "") + '" aria-hidden="true"' + editAttr + ">" +
      '<span class="icon-letter">' + letter + "</span>" + img +
      "</span>";
  }

  function pinItemHtml(p, i, total) {
    const href = Shoucang.escapeAttr(p.url);
    const name = Shoucang.escapeHtml(p.title);
    const edit = Shoucang.state.edit
      ? '<span class="pin-tools">' +
        '<button type="button" class="pin-btn" data-pin-move="-1" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">上移</button>" +
        '<button type="button" class="pin-btn" data-pin-move="1" data-i="' + i + '"' + (i === total - 1 ? " disabled" : "") + ">下移</button>" +
        '<button type="button" class="pin-btn" data-pin-remove="' + href + '">取消</button>' +
        '<button type="button" class="pin-btn icon-edit-btn" data-icon-open="' + href + '" data-icon-title="' + Shoucang.escapeAttr(p.title) + '">图标</button>' +
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

  function loadFeaturedMap() {
    try {
      const raw = localStorage.getItem(FEATURED_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") return obj;
      }
    } catch (err) {}
    return {};
  }

  function saveFeaturedMap(map) {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(map));
  }

  function bareHost(value) {
    return String(value || "").replace(/^www\./, "").toLowerCase();
  }

  function matchesFeaturedKey(item, key) {
    if (!key) return false;
    const url = typeof key === "string" ? key : key.url;
    const title = typeof key === "string" ? "" : (key.title || "");
    if (url) {
      try {
        const kh = bareHost(new URL(url).hostname);
        const ih = bareHost(hostOf(item.url));
        if (kh && ih && (ih === kh || ih.endsWith("." + kh) || kh.endsWith("." + ih))) return true;
      } catch (err) {
        if (bareHost(hostOf(item.url)).indexOf(bareHost(url)) !== -1) return true;
      }
    }
    if (title && String(item.title || "").indexOf(title) !== -1) return true;
    return false;
  }

  function featuredKeysFor(name) {
    const custom = loadFeaturedMap()[name];
    if (Array.isArray(custom) && custom.length) return custom;
    const defaults = (window.FEATURED || {})[name];
    return Array.isArray(defaults) ? defaults : [];
  }

  function shortTitleFor(item, keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key && typeof key === "object" && key.title && matchesFeaturedKey(item, key)) {
        return key.title;
      }
    }
    return item.title;
  }

  function isDefaultPin(item) {
    return (window.DEFAULT_PINS || []).some(function (p) {
      try {
        const ph = bareHost(new URL(p.url).hostname);
        const ih = bareHost(hostOf(item.url));
        return ph && ih && (ih === ph || ih.endsWith("." + ph) || ph.endsWith("." + ih));
      } catch (err) {
        return false;
      }
    });
  }

  function splitCollection(collection) {
    const keys = featuredKeysFor(collection.name);
    const featured = [];
    const used = {};
    function take(pred) {
      collection.items.forEach(function (it) {
        if (featured.length >= FEATURED_LIMIT) return;
        const key = (it.url || "").replace(/\/+$/, "").toLowerCase();
        if (used[key]) return;
        if (pred(it)) {
          used[key] = true;
          featured.push(it);
        }
      });
    }
    keys.forEach(function (key) {
      take(function (it) { return matchesFeaturedKey(it, key); });
    });
    take(isDefaultPin);
    take(function () { return true; });
    const rest = collection.items.filter(function (it) {
      const key = (it.url || "").replace(/\/+$/, "").toLowerCase();
      return !used[key];
    });
    return { featured: featured, rest: rest, keys: keys };
  }

  function setCollectionFeatured(name, url, title, on) {
    const collection = (function () {
      const cat = Shoucang.catalog();
      if (!cat) return null;
      for (let i = 0; i < cat.groups.length; i++) {
        for (let j = 0; j < cat.groups[i].collections.length; j++) {
          if (cat.groups[i].collections[j].name === name) return cat.groups[i].collections[j];
        }
      }
      return null;
    })();
    if (!collection) return { ok: false, error: "找不到这个分类" };
    const split = splitCollection(collection);
    const map = loadFeaturedMap();
    let urls = (map[name] && map[name].length)
      ? map[name].slice()
      : split.featured.map(function (it) { return it.url; });
    const isOn = urls.some(function (u) {
      return (u.url || u) && (String(u.url || u) === url || matchesFeaturedKey({ url: url, title: title }, u));
    });
    if (on) {
      if (isOn) return { ok: true };
      if (urls.length >= FEATURED_LIMIT) {
        return { ok: false, error: "这个分类已有 2 个展示项，请先取消一个" };
      }
      urls.push({ title: title, url: url });
    } else {
      urls = urls.filter(function (u) {
        return !matchesFeaturedKey({ url: url, title: title }, u);
      });
    }
    map[name] = urls;
    saveFeaturedMap(map);
    return { ok: true };
  }

  function resetFeatured() {
    localStorage.removeItem(FEATURED_KEY);
  }

  function itemHtml(item, opts) {
    opts = opts || {};
    const href = Shoucang.escapeAttr(item.url);
    const display = opts.displayTitle || item.title;
    const title = Shoucang.escapeHtml(display);
    const host = Shoucang.escapeHtml(item.host || hostOf(item.url));
    const pinned = Shoucang.isPinned(item.url);
    let editBtn = "";
    if (Shoucang.state.edit) {
      editBtn += '<button type="button" class="pin-btn item-pin" data-pin-toggle="' + href + '" data-pin-title="' + Shoucang.escapeAttr(item.title) + '">' +
        (pinned ? "取消常用" : "加入常用") +
        "</button>";
      editBtn += '<button type="button" class="pin-btn icon-edit-btn" data-icon-open="' + href + '" data-icon-title="' + Shoucang.escapeAttr(item.title) + '">图标</button>';
      if (opts.collection) {
        const shown = !!opts.featured;
        editBtn += '<button type="button" class="pin-btn item-feature" data-feature-toggle="' + (shown ? "off" : "on") + '" data-collection="' + Shoucang.escapeAttr(opts.collection) + '" data-feature-url="' + href + '" data-feature-title="' + Shoucang.escapeAttr(item.title) + '">' +
          (shown ? "取消展示" : "设为展示") +
          "</button>";
      }
    }
    return (
      '<li class="item' + (pinned ? " is-pinned" : "") + '">' +
        '<a class="item-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
          iconHtml(item.url, display, "icon-sm") +
          '<span class="item-text">' +
            '<span class="item-title">' + title + "</span>" +
            (host ? '<small class="item-host">' + host + "</small>" : "") +
          "</span>" +
        "</a>" +
        editBtn +
      "</li>"
    );
  }

  function collectionHtml(c) {
    const split = splitCollection(c);
    const featuredList = '<ul class="item-list">' + split.featured.map(function (it) {
      return itemHtml(it, {
        collection: c.name,
        featured: true,
        displayTitle: shortTitleFor(it, split.keys)
      });
    }).join("") + "</ul>";
    let more = "";
    if (split.rest.length) {
      more =
        '<details class="more">' +
          "<summary>其余 " + split.rest.length + " 条</summary>" +
          '<ul class="item-list">' + split.rest.map(function (it) {
            return itemHtml(it, { collection: c.name, featured: false });
          }).join("") + "</ul>" +
        "</details>";
    }
    return '<section class="col">' +
      '<h3 class="col-name">' + Shoucang.escapeHtml(c.name) + "  " + c.items.length + "</h3>" +
      featuredList + more +
      "</section>";
  }

  let iconTargetUrl = "";
  let lastIconAnchor = null;

  function popoverEls() {
    return {
      pop: document.getElementById("icon-popover"),
      file: document.getElementById("icon-file"),
      url: document.getElementById("icon-url"),
      status: document.getElementById("icon-status"),
    };
  }

  function closeIconPopover() {
    const els = popoverEls();
    if (!els.pop) return;
    els.pop.hidden = true;
    iconTargetUrl = "";
    lastIconAnchor = null;
    if (els.file) els.file.value = "";
    if (els.url) els.url.value = "";
    if (els.status) els.status.textContent = "";
  }

  function placePopover(anchor) {
    const els = popoverEls();
    if (!els.pop) return;
    els.pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const pw = els.pop.offsetWidth || 280;
    const ph = els.pop.offsetHeight || 200;
    let left = r.left;
    let top = r.bottom + 8;
    if (left + pw > window.innerWidth - 12) left = Math.max(12, window.innerWidth - pw - 12);
    if (left < 12) left = 12;
    if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 8);
    els.pop.style.left = left + "px";
    els.pop.style.top = top + "px";
  }

  function openIconPopover(anchor, url, title) {
    const els = popoverEls();
    if (!els.pop || !url) return;
    iconTargetUrl = url;
    lastIconAnchor = anchor;
    const current = iconOverride(url);
    if (els.file) els.file.value = "";
    if (els.url) els.url.value = (current && current.type === "url" && current.src && current.src.indexOf("data:") !== 0) ? current.src : "";
    if (els.status) els.status.textContent = title ? ("为「" + title + "」设置图标") : "";
    placePopover(anchor);
  }

  function applyIconFromPopover() {
    const els = popoverEls();
    if (!iconTargetUrl) return Promise.resolve();
    const file = els.file && els.file.files && els.file.files[0];
    const online = els.url && String(els.url.value || "").trim();
    if (file) {
      return fileToPngDataUrl(file).then(function (dataUrl) {
        return setIconOverride(iconTargetUrl, { src: dataUrl, type: "upload" }).then(function () {
          if (els.status) els.status.textContent = "已保存上传的图标";
          render(Shoucang.state);
        });
      }).catch(function (err) {
        if (els.status) els.status.textContent = (err && err.message) || "请选择图片文件";
      });
    }
    if (online) {
      if (!/^https?:\/\//i.test(online)) {
        if (els.status) els.status.textContent = "在线地址需以 http:// 或 https:// 开头";
        return Promise.resolve();
      }
      return setIconOverride(iconTargetUrl, { src: online, type: "url" }).then(function () {
        if (els.status) els.status.textContent = "已保存在线图标";
        render(Shoucang.state);
      });
    }
    if (els.status) els.status.textContent = "请上传文件或填写在线地址";
    return Promise.resolve();
  }

  function resetIconFromPopover() {
    if (!iconTargetUrl) return Promise.resolve();
    const els = popoverEls();
    return setIconOverride(iconTargetUrl, null).then(function () {
      if (els.status) els.status.textContent = "已恢复默认图标";
      if (els.file) els.file.value = "";
      if (els.url) els.url.value = "";
      render(Shoucang.state);
    });
  }

  function render(state) {
    const pinsEl = document.getElementById("pins");
    const groupsEl = document.getElementById("groups");
    const resultsEl = document.getElementById("results");
    const statusEl = document.getElementById("status");
    const pins = state.pins;
    pinsEl.innerHTML = pins.map(function (p, i) { return pinItemHtml(p, i, pins.length); }).join("");

    if (!state.edit) closeIconPopover();

    const cat = Shoucang.catalog();
    if (!cat) {
      statusEl.textContent = "未能载入收藏目录。";
      return;
    }

    if (state.engine === "library" && state.query.trim()) {
      const hits = Shoucang.searchCatalog(state.query);
      resultsEl.innerHTML =
        '<p class="result-count">找到 ' + hits.length + " 条</p>" +
        '<ul class="item-list">' + hits.map(itemHtml).join("") + "</ul>";
      groupsEl.hidden = true;
      statusEl.textContent = "";
      return;
    }

    resultsEl.innerHTML = "";
    document.documentElement.classList.toggle("is-group-open", !!state.openGroup);
    groupsEl.hidden = false;
    groupsEl.innerHTML = cat.groups.map(function (g) {
      const body = g.collections.map(function (c) {
        return collectionHtml(c);
      }).join("");
      return (
        '<details class="cat"' + (state.openGroup === g.id ? " open" : "") + ' data-group="' + g.id + '">' +
          "<summary>" + Shoucang.escapeHtml(g.name) + "</summary>" +
          '<div class="cat-body">' + body + "</div>" +
        "</details>"
      );
    }).join("");
    const data = window.STARTPAGE_DATA || {};
    const kind = data.includes_intranet ? "条收藏" : "条公开收藏";
    statusEl.textContent = "共 " + cat.total + " " + kind + "。每个分类先列出 2 个常用链接，其余在折叠栏里。";
  }

  function bindIconUi() {
    const els = popoverEls();
    document.body.addEventListener("click", function (ev) {
      if (!Shoucang.state.edit) return;
      const openBtn = ev.target.closest("[data-icon-open]");
      if (openBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        openIconPopover(openBtn, openBtn.getAttribute("data-icon-open"), openBtn.getAttribute("data-icon-title") || "");
        return;
      }
    });
    document.body.addEventListener("click", function (ev) {
      if (!Shoucang.state.edit) return;
      const icon = ev.target.closest(".icon[data-icon-url]");
      if (!icon) return;
      ev.preventDefault();
      ev.stopPropagation();
      openIconPopover(icon, icon.getAttribute("data-icon-url"), icon.getAttribute("data-icon-title") || "");
    }, true);

    if (els.pop) {
      document.getElementById("icon-apply").addEventListener("click", function () {
        applyIconFromPopover();
      });
      document.getElementById("icon-reset").addEventListener("click", function () {
        resetIconFromPopover();
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && els.pop && !els.pop.hidden) {
          ev.preventDefault();
          closeIconPopover();
        }
      });
      document.addEventListener("click", function (ev) {
        if (els.pop.hidden) return;
        if (els.pop.contains(ev.target)) return;
        if (ev.target.closest("[data-icon-open], .icon[data-icon-url]")) return;
        closeIconPopover();
      });
    }

    const exportBtn = document.getElementById("export-icons");
    const importBtn = document.getElementById("import-icons");
    const importFile = document.getElementById("import-icons-file");
    const addStatus = document.getElementById("add-status");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const blob = new Blob([JSON.stringify(exportIconSettings(), null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "navpage-icons.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (addStatus) addStatus.textContent = "已导出图标设置";
      });
    }
    if (importBtn && importFile) {
      importBtn.addEventListener("click", function () { importFile.click(); });
      importFile.addEventListener("change", function () {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const data = JSON.parse(String(reader.result || ""));
            importIconSettings(data).then(function (result) {
              if (addStatus) addStatus.textContent = result.ok ? ("已导入 " + result.count + " 条图标设置") : result.error;
              if (result.ok) render(Shoucang.state);
            });
          } catch (err) {
            if (addStatus) addStatus.textContent = "无法读取该 JSON 文件";
          }
          importFile.value = "";
        };
        reader.onerror = function () {
          if (addStatus) addStatus.textContent = "无法读取该文件";
          importFile.value = "";
        };
        reader.readAsText(file);
      });
    }
  }

  function startPage() {
    const groupsEl = document.getElementById("groups");
    groupsEl.addEventListener("toggle", function (ev) {
      const d = ev.target;
      if (!d || d.classList === undefined || !d.classList.contains("cat")) return;
      if (d.open) {
        groupsEl.querySelectorAll("details.cat").forEach(function (other) {
          if (other !== d) other.open = false;
        });
        Shoucang.state.openGroup = d.getAttribute("data-group");
      } else if (Shoucang.state.openGroup === d.getAttribute("data-group")) {
        Shoucang.state.openGroup = null;
      }
      document.documentElement.classList.toggle("is-group-open", !!Shoucang.state.openGroup);
    }, true);

    Shoucang.startClock({ clock: document.getElementById("clock"), date: document.getElementById("date") });
    Shoucang.boot({
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

    const resetFeaturedBtn = document.getElementById("reset-featured");
    if (resetFeaturedBtn) {
      resetFeaturedBtn.addEventListener("click", function () {
        resetFeatured();
        const addStatus = document.getElementById("add-status");
        if (addStatus) addStatus.textContent = "已恢复各分类的默认展示";
        render(Shoucang.state);
      });
    }

    document.body.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-feature-toggle]");
      if (!btn) return;
      ev.preventDefault();
      const on = btn.getAttribute("data-feature-toggle") === "on";
      const result = setCollectionFeatured(
        btn.getAttribute("data-collection"),
        btn.getAttribute("data-feature-url"),
        btn.getAttribute("data-feature-title"),
        on
      );
      const addStatus = document.getElementById("add-status");
      if (addStatus) addStatus.textContent = result.ok ? (on ? "已设为分类展示" : "已取消分类展示") : result.error;
      if (result.ok) render(Shoucang.state);
    });

    bindIconUi();
  }

  loadScript("data.full.js").catch(function () {
    return loadScript("data.js");
  }).then(function () {
    return loadIcons();
  }).then(startPage).catch(function () {
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.textContent = "未能载入收藏目录。";
  });

})();
