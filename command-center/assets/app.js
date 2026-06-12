// command center — vanilla JS, hash router, JSON state
const state = { strategy:null, initiatives:[], tasks:[], recognitions:[], team:[] };
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const fmtDate = (iso) => {
  if(!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
};
const fmtFull = (d) => d.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};
const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const statusMap = {
  "on-track": { label:"on track", cls:"ok" },
  "at-risk":  { label:"at risk",  cls:"risk" },
  "blocked":  { label:"blocked",  cls:"blocked" },
  "done":     { label:"done",     cls:"done" }
};

const initiativeById = (id) => state.initiatives.find(i => i.id === id);
const pillarById = (id) => (state.strategy?.pillars || []).find(p => p.id === id);

function progressFor(horizon){
  const list = state.tasks.filter(t => t.horizon === horizon);
  if (!list.length) return { pct:0, done:0, total:0 };
  const done = list.filter(t => t.done).length;
  return { pct: done / list.length, done, total: list.length };
}
function overallProgress(){
  if (!state.tasks.length) return 0;
  return state.tasks.filter(t => t.done).length / state.tasks.length;
}

function bar(pct, warm=false){
  const w = Math.round((pct||0) * 100);
  return `<div class="bar ${warm?'warm':''}"><i style="width:${w}%"></i></div>`;
}

// --- views -------------------------------------------------------------

function viewHome(){
  const today = new Date();
  const inWeek = state.tasks.filter(t => {
    const d = new Date(t.due + "T00:00:00");
    const diff = (d - today) / 86400000;
    return diff >= -1 && diff <= 7;
  });
  const dueSoon = inWeek.filter(t => !t.done).length;
  const oooNow = state.team.filter(m =>
    (m.ooo||[]).some(o => new Date(o.from) <= today && today <= new Date(o.to))
  ).length;
  const pendingRequests = state.team.reduce((n,m) => n + (m.requests||[]).filter(r => r.status === "pending").length, 0);
  const lastRecog = [...state.recognitions].sort((a,b) => b.date.localeCompare(a.date))[0];
  const active = state.initiatives.filter(i => i.status !== "done").slice(0,4);
  const upcoming = [...state.tasks].filter(t => !t.done).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,4);
  const overall = overallProgress();

  return `
    <div class="hero">
      <h1>${greeting()}, Damian.</h1>
      <p>${fmtFull(today)} · ${state.initiatives.length} initiatives, ${state.tasks.length} tasks tracked.</p>
    </div>

    <div class="row row-3">
      <div class="card">
        <h3>overall progress</h3>
        <div class="kpi">${Math.round(overall*100)}%</div>
        ${bar(overall)}
        <div class="kpi-sub">${state.tasks.filter(t=>t.done).length} of ${state.tasks.length} done</div>
      </div>
      <div class="card">
        <h3>this week</h3>
        <div class="kpi">${inWeek.length}</div>
        <div class="kpi-sub">${dueSoon} still open</div>
      </div>
      <div class="card">
        <h3>team</h3>
        <div class="kpi">${oooNow}<span style="font-size:18px;color:var(--muted)"> ooo</span></div>
        <div class="kpi-sub">${pendingRequests} pending requests</div>
      </div>
    </div>

    <div class="section-head"><h2>active initiatives</h2><a href="#/initiatives">see all →</a></div>
    <div class="list">
      ${active.map(i => `
        <div class="item">
          <span class="status ${statusMap[i.status].cls}"><span class="pip"></span>${statusMap[i.status].label}</span>
          <div class="title">${escapeHTML(i.title)}</div>
          <div class="meta" style="min-width:120px">${Math.round(i.progress*100)}%</div>
          <div style="width:140px">${bar(i.progress)}</div>
        </div>
      `).join("")}
    </div>

    <div class="row row-2" style="margin-top:36px">
      <div>
        <div class="section-head"><h2>upcoming</h2><a href="#/tasks">tasks →</a></div>
        <div class="list">
          ${upcoming.map(t => `
            <div class="item">
              <span class="check" data-task="${t.id}"></span>
              <div class="title">${escapeHTML(t.title)}</div>
              <span class="tag">${escapeHTML(t.horizon)}</span>
              <div class="meta">${fmtDate(t.due)}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="section-head"><h2>recent recognition</h2><a href="#/recognitions">all →</a></div>
        <div class="recog">
          ${lastRecog ? `
            <div class="item">
              <div class="quote">"${escapeHTML(lastRecog.note)}"</div>
              <div class="meta"><span>${escapeHTML(lastRecog.person)}</span><span>·</span><span>${escapeHTML(lastRecog.type)}</span><span>·</span><span>${fmtDate(lastRecog.date)}</span></div>
            </div>` : `<div class="muted">No recognitions yet.</div>`}
        </div>
      </div>
    </div>
  `;
}

function viewStrategy(){
  const s = state.strategy || {};
  return `
    <div class="hero">
      <h1>Strategy &amp; Vision</h1>
      <p>${escapeHTML(s.horizon || "")} · the north star</p>
    </div>

    <p class="vision">"${escapeHTML(s.vision || "")}"</p>

    <div class="section-head"><h2>pillars</h2></div>
    <div class="row row-3">
      ${(s.pillars||[]).map(p => `
        <div class="pillar">
          <h4 style="color:${p.color||'var(--ink)'}">${escapeHTML(p.name)}</h4>
          <p>${escapeHTML(p.summary)}</p>
        </div>
      `).join("")}
    </div>

    <div class="section-head"><h2>okrs</h2></div>
    <div class="card">
      ${(s.okrs||[]).map(o => {
        const p = pillarById(o.pillar);
        return `
          <div class="okr">
            <div style="min-width:0;flex:1">
              <div style="font-family:var(--serif);font-size:18px">${escapeHTML(o.objective)}</div>
              <div class="muted" style="font-size:13px">${escapeHTML(o.kr)} ${p?`· <span class="tag">${escapeHTML(p.name)}</span>`:''}</div>
            </div>
            <div style="width:180px;display:flex;align-items:center;gap:10px">
              <div style="flex:1">${bar(o.progress, true)}</div>
              <div class="muted" style="font-variant-numeric:tabular-nums">${Math.round(o.progress*100)}%</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function viewInitiatives(){
  return `
    <div class="hero">
      <h1>Initiatives</h1>
      <p>What we're moving this fiscal year.</p>
    </div>

    <div class="list">
      ${state.initiatives.map(i => {
        const p = pillarById(i.pillar);
        return `
          <div class="item" style="padding:18px 4px;align-items:flex-start;flex-wrap:wrap">
            <span class="status ${statusMap[i.status].cls}"><span class="pip"></span>${statusMap[i.status].label}</span>
            <div class="title" style="white-space:normal">
              <div style="font-family:var(--serif);font-size:20px">${escapeHTML(i.title)}</div>
              <div class="muted" style="font-size:13px;margin-top:2px">${escapeHTML(i.summary)}</div>
            </div>
            <div class="meta" style="min-width:120px;text-align:right">
              <div>${escapeHTML(i.owner)}</div>
              <div style="font-size:12px">${fmtDate(i.due)}</div>
            </div>
            <div style="width:200px">
              ${bar(i.progress)}
              <div class="muted" style="font-size:12px;margin-top:6px;display:flex;justify-content:space-between">
                <span>${p ? escapeHTML(p.name) : ''}</span>
                <span>${Math.round(i.progress*100)}%</span>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

let currentHorizon = "weekly";
function viewTasks(){
  const horizons = ["weekly","monthly","quarterly"];
  const tabs = horizons.map(h => {
    const p = progressFor(h);
    return `<button data-h="${h}" class="${h===currentHorizon?'active':''}">${h} ${Math.round(p.pct*100)}%</button>`;
  }).join("");
  const list = state.tasks.filter(t => t.horizon === currentHorizon);
  const p = progressFor(currentHorizon);

  return `
    <div class="hero">
      <h1>Tasks</h1>
      <p>Weekly, monthly, quarterly — what's actually getting done.</p>
    </div>

    <div class="flex center between mb-3">
      <div class="tabs" id="hTabs">${tabs}</div>
      <div class="tab-meta">${p.done}/${p.total} done</div>
    </div>

    <div style="margin-bottom:18px">${bar(p.pct)}</div>

    <div class="list">
      ${list.length ? list.map(t => {
        const i = initiativeById(t.initiative);
        return `
          <div class="item">
            <span class="check ${t.done?'on':''}" data-task="${t.id}"></span>
            <div class="title task-title ${t.done?'on':''}">${escapeHTML(t.title)}</div>
            ${i ? `<span class="tag">${escapeHTML(i.title)}</span>` : ''}
            <div class="meta">${fmtDate(t.due)}</div>
          </div>
        `;
      }).join("") : `<div class="muted" style="padding:24px 0">No tasks in this horizon yet. Try ⌘K.</div>`}
    </div>
  `;
}

function viewRecognitions(){
  const sorted = [...state.recognitions].sort((a,b)=>b.date.localeCompare(a.date));
  const byMonth = {};
  sorted.forEach(r => {
    const key = r.date.slice(0,7);
    (byMonth[key] = byMonth[key] || []).push(r);
  });
  const months = Object.keys(byMonth).sort().reverse();

  return `
    <div class="hero">
      <h1>Recognitions</h1>
      <p>A log of what the team did well — so we don't forget at review time.</p>
    </div>

    ${months.map(m => {
      const date = new Date(m + "-01T00:00:00");
      const label = date.toLocaleDateString("en-US", { month:"long", year:"numeric" });
      return `
        <div class="section-head"><h2>${label}</h2><span class="muted">${byMonth[m].length}</span></div>
        <div class="recog">
          ${byMonth[m].map(r => `
            <div class="item">
              <div class="quote">"${escapeHTML(r.note)}"</div>
              <div class="meta"><span>${escapeHTML(r.person)}</span><span>·</span><span class="tag">${escapeHTML(r.type)}</span><span>·</span><span>${fmtDate(r.date)}</span></div>
            </div>
          `).join("")}
        </div>
      `;
    }).join("")}
  `;
}

function viewTeam(){
  const today = new Date();
  const allOOO = state.team.flatMap(m => (m.ooo||[]).map(o => ({ name:m.name, ...o }))).sort((a,b)=>a.from.localeCompare(b.from));
  const requests = state.team.flatMap(m => (m.requests||[]).map(r => ({ name:m.name, ...r })));
  const pending = requests.filter(r => r.status === "pending");

  return `
    <div class="hero">
      <h1>Team</h1>
      <p>${state.team.length} people · ${pending.length} pending requests</p>
    </div>

    <div class="row row-3">
      ${state.team.map(m => {
        const ooo = (m.ooo||[]).find(o => new Date(o.from) <= today && today <= new Date(o.to));
        return `
          <div class="person">
            <div class="name">${escapeHTML(m.name)}</div>
            <div class="role">${escapeHTML(m.role)}</div>
            <div class="next">
              ${ooo ? `<span class="tag" style="color:var(--danger);border-color:var(--danger)">ooo · until ${fmtDate(ooo.to)}</span>` : `next 1:1 · ${fmtDate(m.next1on1)}`}
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="row row-2" style="margin-top:36px">
      <div>
        <div class="section-head"><h2>vacations &amp; ooo</h2></div>
        <div class="list">
          ${allOOO.length ? allOOO.map(o => `
            <div class="item">
              <div class="title">${escapeHTML(o.name)}</div>
              <span class="tag">${escapeHTML(o.type)}</span>
              <div class="meta">${fmtDate(o.from)} – ${fmtDate(o.to)}</div>
            </div>
          `).join("") : `<div class="muted" style="padding:14px 0">No OOO scheduled.</div>`}
        </div>
      </div>
      <div>
        <div class="section-head"><h2>pending requests</h2></div>
        <div class="list">
          ${requests.length ? requests.map(r => `
            <div class="item">
              <div class="title">${escapeHTML(r.title)}</div>
              <span class="tag">${escapeHTML(r.name)}</span>
              <span class="status ${r.status==='approved'?'ok':r.status==='blocked'?'blocked':''}"><span class="pip"></span>${escapeHTML(r.status)}</span>
            </div>
          `).join("") : `<div class="muted" style="padding:14px 0">Nothing pending.</div>`}
        </div>
      </div>
    </div>
  `;
}

// --- router ------------------------------------------------------------

const routes = {
  home: { label:"Home", render: viewHome },
  strategy: { label:"Strategy & Vision", render: viewStrategy },
  initiatives: { label:"Initiatives", render: viewInitiatives },
  tasks: { label:"Tasks", render: viewTasks },
  recognitions: { label:"Recognitions", render: viewRecognitions },
  team: { label:"Team", render: viewTeam }
};

function currentRoute(){
  const hash = location.hash.replace(/^#\//,"") || "home";
  return routes[hash] ? hash : "home";
}

function render(){
  const r = currentRoute();
  $("#view").innerHTML = routes[r].render();
  $("#crumbs").textContent = routes[r].label;
  $$("#nav a").forEach(a => a.classList.toggle("active", a.dataset.route === r));
  attachViewHandlers();
}

function attachViewHandlers(){
  $$(".check[data-task]").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.task;
      const t = state.tasks.find(x => x.id === id);
      if (t){ t.done = !t.done; render(); }
    });
  });
  $$("#hTabs button").forEach(btn => {
    btn.addEventListener("click", () => { currentHorizon = btn.dataset.h; render(); });
  });
}

// --- quick capture -----------------------------------------------------

let captureType = "task";
function openModal(){
  $("#modal").hidden = false;
  setTimeout(() => $("#captureInput").focus(), 30);
}
function closeModal(){
  $("#modal").hidden = true;
  $("#captureInput").value = "";
}
function commitCapture(){
  const text = $("#captureInput").value.trim();
  if (!text) return;
  const today = new Date().toISOString().slice(0,10);
  if (captureType === "task"){
    state.tasks.unshift({
      id: "t" + Date.now(),
      title: text,
      horizon: $("#captureHorizon").value,
      initiative: null,
      due: today,
      done: false
    });
  } else if (captureType === "recognition"){
    state.recognitions.unshift({
      id: "r" + Date.now(),
      date: today,
      person: "—",
      type: "impact",
      note: text
    });
  } else if (captureType === "request"){
    const me = state.team[0];
    if (me){
      me.requests = me.requests || [];
      me.requests.push({ id: "q" + Date.now(), title: text, status: "pending" });
    }
  }
  closeModal();
  render();
}

// --- export ------------------------------------------------------------

function downloadJSON(name, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

// --- boot --------------------------------------------------------------

async function loadAll(){
  const [s, i, t, r, m] = await Promise.all([
    fetch("data/strategy.json").then(x=>x.json()),
    fetch("data/initiatives.json").then(x=>x.json()),
    fetch("data/tasks.json").then(x=>x.json()),
    fetch("data/recognitions.json").then(x=>x.json()),
    fetch("data/team.json").then(x=>x.json())
  ]);
  state.strategy = s;
  state.initiatives = i;
  state.tasks = t;
  state.recognitions = r;
  state.team = m;
}

async function boot(){
  $("#today").textContent = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  try {
    await loadAll();
  } catch (err){
    $("#view").innerHTML = `<div class="card"><h3>Could not load data</h3><p class="muted">Open this through a local server (e.g. <code>python3 -m http.server</code> inside <code>command-center/</code>) so the browser can read the JSON files.</p><pre style="white-space:pre-wrap;color:var(--danger)">${escapeHTML(err.message)}</pre></div>`;
    return;
  }
  render();

  window.addEventListener("hashchange", render);

  $("#kTrigger").addEventListener("click", openModal);
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  $$("#captureType button").forEach(b => {
    b.addEventListener("click", () => {
      captureType = b.dataset.type;
      $$("#captureType button").forEach(x => x.classList.toggle("active", x === b));
      $("#captureMeta").style.display = captureType === "task" ? "" : "none";
    });
  });
  $("#captureInput").addEventListener("keydown", e => {
    if (e.key === "Enter") commitCapture();
    if (e.key === "Escape") closeModal();
  });
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); openModal(); }
  });

  $("#exportBtn").addEventListener("click", () => {
    downloadJSON("strategy.json", state.strategy);
    downloadJSON("initiatives.json", state.initiatives);
    downloadJSON("tasks.json", state.tasks);
    downloadJSON("recognitions.json", state.recognitions);
    downloadJSON("team.json", state.team);
  });
}

boot();
