// Africa Esports Radar — frontend
// Pulls /api/feeds, builds dynamic filter chips, renders items grouped by day.

const REGION_LABELS = {
  sa: "South Africa",
  africa: "Africa",
  global: "Global (filtered)",
};

const CATEGORY_LABELS = {
  news: "News",
  results: "Results",
  community: "Community",
  video: "Video",
  announcement: "Announcement",
};

const PLATFORM_LABELS = {
  Web: "Web",
  Reddit: "Reddit",
  YouTube: "YouTube",
  X: "X",
  Instagram: "Instagram",
  Twitch: "Twitch",
  Facebook: "Facebook",
  Mastodon: "Mastodon",
  Bluesky: "Bluesky",
  Kick: "Kick",
};

const GAME_LABELS = {
  cs2: "CS2",
  valorant: "Valorant",
  dota2: "Dota 2",
  lol: "LoL",
  mlbb: "MLBB",
  pubgm: "PUBG Mobile",
  freefire: "Free Fire",
  cod: "CoD",
  fc: "EA FC",
  fifa: "FIFA",
  apex: "Apex",
  gta: "GTA",
  general: "General",
  multiple: "Multiple",
  mobile: "Mobile",
};

const state = {
  items: [],
  filters: {
    platform: new Set(),
    region: new Set(),
    category: new Set(),
    game: new Set(),
    search: "",
  },
};

// ─── FETCH ────────────────────────────────────────────────────────────

async function loadFeeds() {
  try {
    const res = await fetch("/api/feeds", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.items = data.items || [];
    updateStatus(data);
    buildFilters(state.items);
    render();
  } catch (err) {
    document.getElementById("feed").innerHTML = `
      <div class="empty">
        Failed to load feeds — ${escapeHtml(String(err.message || err))}
      </div>`;
  }
}

function updateStatus(data) {
  const updated = data.generated_at ? new Date(data.generated_at) : null;
  const lu = document.getElementById("last-update");
  lu.textContent = updated ? formatTime(updated) : "—";
  lu.classList.add("live");
  document.getElementById(
    "sources-ok"
  ).textContent = `${data.sources_ok}/${data.sources_total}`;
  document.getElementById("items-count").textContent = String(data.items_total);
}

// ─── FILTERS ──────────────────────────────────────────────────────────

function buildFilters(items) {
  const platformCounts = {};
  const regionCounts = {};
  const catCounts = {};
  const gameCounts = {};

  for (const item of items) {
    const p = item.platform || "Web";
    platformCounts[p] = (platformCounts[p] || 0) + 1;
    regionCounts[item.region] = (regionCounts[item.region] || 0) + 1;
    catCounts[item.category] = (catCounts[item.category] || 0) + 1;
    for (const g of item.games || []) {
      gameCounts[g] = (gameCounts[g] || 0) + 1;
    }
  }

  renderChips(
    "chips-platform",
    platformCounts,
    "platform",
    (k) => PLATFORM_LABELS[k] || k
  );
  renderChips(
    "chips-region",
    regionCounts,
    "region",
    (k) => REGION_LABELS[k] || k
  );
  renderChips(
    "chips-category",
    catCounts,
    "category",
    (k) => CATEGORY_LABELS[k] || k
  );
  renderChips("chips-game", gameCounts, "game", (k) => GAME_LABELS[k] || k);

  document.getElementById("search").addEventListener("input", (e) => {
    state.filters.search = e.target.value.toLowerCase().trim();
    render();
  });
}

function renderChips(containerId, counts, filterKey, labelFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of entries) {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.value = key;
    if (filterKey === "platform") btn.classList.add(`plat-${escapeAttr(key)}`);
    btn.innerHTML = `${labelFn(key)}<span class="chip-count">${count}</span>`;
    btn.addEventListener("click", () => {
      const set = state.filters[filterKey];
      if (set.has(key)) set.delete(key);
      else set.add(key);
      btn.classList.toggle("active");
      render();
    });
    container.appendChild(btn);
  }
}

// ─── RENDER ───────────────────────────────────────────────────────────

function filteredItems() {
  const { platform, region, category, game, search } = state.filters;
  return state.items.filter((item) => {
    if (platform.size && !platform.has(item.platform || "Web")) return false;
    if (region.size && !region.has(item.region)) return false;
    if (category.size && !category.has(item.category)) return false;
    if (game.size) {
      const itemGames = item.games || [];
      if (!itemGames.some((g) => game.has(g))) return false;
    }
    if (search) {
      const hay = `${item.title} ${item.description} ${item.source}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function render() {
  const feed = document.getElementById("feed");
  const items = filteredItems();

  if (items.length === 0) {
    feed.innerHTML = `<div class="empty">No items match the current filters.</div>`;
    return;
  }

  const groups = new Map();
  for (const item of items) {
    const date = item.published ? new Date(item.published) : null;
    const key = date ? dateKey(date) : "undated";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const fragments = [];
  for (const [key, groupItems] of groups) {
    const dateLabel =
      key === "undated"
        ? "Undated"
        : formatDayHeader(new Date(groupItems[0].published));
    fragments.push(`
      <section class="day-group">
        <header class="day-header">
          <h2 class="day-date">${dateLabel}</h2>
          <span class="day-meta">${groupItems.length} item${
      groupItems.length === 1 ? "" : "s"
    }</span>
        </header>
        ${groupItems.map(renderItem).join("")}
      </section>
    `);
  }

  feed.innerHTML = fragments.join("");
}

function renderItem(item) {
  const time = item.published ? formatTime(new Date(item.published)) : "—";
  const platform = item.platform || "Web";

  const gameTags = (item.games || [])
    .filter((g) => g && g !== "general" && g !== "multiple")
    .map(
      (g) =>
        `<span class="item-tag game-${escapeAttr(g)}">${escapeHtml(
          GAME_LABELS[g] || g
        )}</span>`
    )
    .join("");

  return `
    <article class="item">
      <div class="item-time">${escapeHtml(time)}</div>
      <div class="item-body">
        <div class="item-meta">
          <span class="platform-badge plat-${escapeAttr(platform)}">${escapeHtml(
    PLATFORM_LABELS[platform] || platform
  )}</span>
          <span class="item-source">${escapeHtml(item.source)}</span>
          <span class="item-dot"></span>
          <span class="item-tag cat-${escapeAttr(item.category)}">${escapeHtml(
    CATEGORY_LABELS[item.category] || item.category
  )}</span>
          <span class="item-tag region-${escapeAttr(item.region)}">${escapeHtml(
    REGION_LABELS[item.region] || item.region
  )}</span>
          ${gameTags}
        </div>
        <h3 class="item-title">
          <a href="${escapeAttr(item.link)}" target="_blank" rel="noopener">${escapeHtml(
    item.title
  )}</a>
        </h3>
        ${
          item.description
            ? `<p class="item-desc">${escapeHtml(item.description)}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

// ─── HELPERS ──────────────────────────────────────────────────────────

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayHeader(d) {
  const now = new Date();
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 86400000));
  const k = dateKey(d);
  if (k === today) return "Today";
  if (k === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(d) {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/\s+/g, "-");
}

loadFeeds();
