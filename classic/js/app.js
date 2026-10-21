const DOMAIN_LABEL = { "Agriculture": "农业（Agriculture）", "AutoResearch": "自动科研（AutoResearch）", "Coding": "编程（Coding）", "Education": "教育（Education）", "Embodied & Robotics": "具身智能与机器人（Embodied & Robotics）", "Entertainment & Media": "娱乐与媒体（Entertainment & Media）", "GUI Agents": "图形界面智能体（GUI Agents）", "General References": "通用参考文献（General References）", "Healthcare": "医疗健康（Healthcare）", "Information Access": "信息获取（Information Access）", "Law": "法律（Law）", "Security": "安全（Security）", "Smart City": "智慧城市（Smart City）", "Smart Home": "智能家居（Smart Home）" };
const domainLabel = d => DOMAIN_LABEL[d] || d;
const initiativeLabel = i => ({ Forecast: "预测（Forecast）", "Forecast–mandate": "预测—委托（Forecast–mandate）", Mandate: "委托（Mandate）", "Reactive–mandate": "被动响应—委托（Reactive–mandate）", Trigger: "触发（Trigger）", "Trigger–forecast": "触发—预测（Trigger–forecast）" })[i] || i;
const typeLabel = t => ({ Research: "科研", Commercial: "商业" })[t] || t;

const state = { systems: [], filtered: [] };

const escapeHTML = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`无法加载 ${path}`);
  return response.json();
}

function renderSite(site) {
  document.querySelectorAll('[data-field="tagline"]').forEach(el => el.textContent = site.tagline);
  document.querySelectorAll('[data-field="abstract"]').forEach(el => el.textContent = site.abstract);
  document.querySelectorAll('[data-link="github"]').forEach(el => el.href = site.links.github);
  // lines break between names, after the dot, and an author's name stays on one line
  document.querySelector("#authors").replaceChildren(...site.authors.flatMap((name, index, all) => {
    const span = document.createElement("span");
    span.textContent = index < all.length - 1 ? `${name} ·` : name;
    return [span, " "];
  }));
  document.querySelector("#affiliations").textContent = site.affiliations.join("\u00a0· ");
  document.querySelector("#citation-code").textContent = site.citation;
}

function renderTaxonomy(data) {
  document.querySelector("#capacity-grid").innerHTML = data.capacities.map((capacity, index) => `
    <article class="capacity-card">
      <span class="capacity-number">0${index + 1}</span>
      <h3>${escapeHTML(capacity.name)}</h3>
      <p class="capacity-question">${escapeHTML(capacity.question)}</p>
      <p class="capacity-description">${escapeHTML(capacity.description)}</p>
      <details class="capacity-details">
        <summary>${capacity.subdimensions.length} 个研究维度</summary>
        <ul>${capacity.subdimensions.map(item => `<li><strong>${escapeHTML(item.display_name || item.name)}</strong>: ${escapeHTML(item.works.join(", "))}</li>`).join("")}</ul>
      </details>
    </article>
  `).join("");
}

function renderEvaluation(data) {
  // one row per level: its name and purpose on the left, its metric groups in two columns on the right
  document.querySelector("#evaluation-grid").innerHTML = data.levels.map((level, index) => `
    <article class="evaluation-card">
      <header class="evaluation-head">
        <p class="kicker">层次 0${index + 1}</p>
        <h3>${escapeHTML(level.name)}</h3>
        <p class="evaluation-purpose">${escapeHTML(level.purpose)}</p>
      </header>
      <div class="metric-groups">
        ${level.categories.map(category => `
          <div class="metric-group">
            <h4>${escapeHTML(category.name)}</h4>
            <div class="metric-list">${category.metrics.map(metric => `<span>${escapeHTML(metric)}</span>`).join("")}</div>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderMaturity(data) {
  document.querySelector("#maturity-grid").innerHTML = data.domains.map(item => `
    <article class="maturity-card">
      <h3>${escapeHTML(item.domain_zh || domainLabel(item.domain))}</h3>
      <div class="maturity-tags">
        <span class="tag">${escapeHTML(item.initiative_zh || initiativeLabel(item.initiative))}</span>
        <span class="tag tag-authority">${escapeHTML(item.authority_zh || item.authority)}</span>
      </div>
      <dl>
        <dt>下一里程碑</dt><dd>${escapeHTML(item.milestone)}</dd>
        <dt>关键约束</dt><dd>${escapeHTML(item.constraint)}</dd>
      </dl>
    </article>
  `).join("");
}

function normalizeType(value) {
  return value.toLowerCase().startsWith("com") ? "Commercial" : "Research";
}

function renderSystems() {
  const body = document.querySelector("#systems-body");
  const count = document.querySelector("#result-count");
  count.textContent = `显示 ${state.systems.length} 项代表性工作中的 ${state.filtered.length} 项`;
  if (!state.filtered.length) {
    body.innerHTML = '<tr><td class="empty-state" colspan="8">没有符合这些筛选条件的条目。</td></tr>';
    return;
  }
  body.innerHTML = state.filtered.map(item => `
    <tr>
      <td>${escapeHTML(item.system)}</td>
      <td><span class="domain-pill">${escapeHTML(item.domain_zh || domainLabel(item.domain))}</span></td>
      <td>${escapeHTML(item.awareness || "—")}</td>
      <td>${escapeHTML(item.anticipation || "—")}</td>
      <td>${escapeHTML(item.arbitration || "—")}</td>
      <td>${escapeHTML(item.action || "—")}</td>
      <td>${escapeHTML(item.adaptation || "—")}</td>
      <td>${escapeHTML(item.deployment || "—")}<br><small>${typeLabel(normalizeType(item.research_type))}</small></td>
    </tr>
  `).join("");
}

function applyFilters() {
  const query = document.querySelector("#system-search").value.trim().toLowerCase();
  const domain = document.querySelector("#domain-filter").value;
  const type = document.querySelector("#type-filter").value;
  state.filtered = state.systems.filter(item => {
    const haystack = [...Object.values(item).flat(), domainLabel(item.domain), typeLabel(item.research_type)].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!domain || item.domain === domain)
      && (!type || normalizeType(item.research_type) === type);
  });
  renderSystems();
}

function setupExplorer(data) {
  state.systems = data.systems;
  state.filtered = data.systems;
  document.querySelectorAll('[data-count="works"]').forEach(el => { el.textContent = data.systems.length; });
  const domainFilter = document.querySelector("#domain-filter");
  [...new Set(data.systems.map(item => item.domain))].sort().forEach(domain => {
    domainFilter.insertAdjacentHTML("beforeend", `<option value="${escapeHTML(domain)}">${escapeHTML(domainLabel(domain))}</option>`);
  });
  ["#system-search", "#domain-filter", "#type-filter"].forEach(selector => {
    document.querySelector(selector).addEventListener("input", applyFilters);
  });
  document.querySelector("#clear-filters").addEventListener("click", () => {
    document.querySelector("#system-search").value = "";
    domainFilter.value = "";
    document.querySelector("#type-filter").value = "";
    applyFilters();
  });
  document.querySelector("#last-updated").textContent = new Date(`${data.updated}T12:00:00`).toLocaleDateString("zh-CN", { month: "long", year: "numeric" });
  renderSystems();
}

function setupInteractions() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector("#nav-links");
  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  links.addEventListener("click", () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
  document.querySelector("#copy-citation").addEventListener("click", async event => {
    await navigator.clipboard.writeText(document.querySelector("#citation-code").textContent);
    event.currentTarget.textContent = "已复制";
    setTimeout(() => event.currentTarget.textContent = "复制 BibTeX", 1600);
  });
}

async function init() {
  setupInteractions();
  try {
    const [site, taxonomy, evaluation, maturity, applications] = await Promise.all([
      loadJSON("../data/site.json"),
      loadJSON("../data/taxonomy.json"),
      loadJSON("../data/evaluation.json"),
      loadJSON("../data/maturity.json"),
      loadJSON("../data/applications.json")
    ]);
    renderSite(site);
    renderTaxonomy(taxonomy);
    renderEvaluation(evaluation);
    renderMaturity(maturity);
    setupExplorer(applications);
  } catch (error) {
    console.error(error);
    document.querySelector("#result-count").textContent = "无法加载综述数据。";
  }
}

init();
