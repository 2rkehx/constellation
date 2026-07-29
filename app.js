import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPA_URL = "https://tvmjrdutwxxvgfhnxuig.supabase.co";
const SUPA_KEY = "sb_publishable_NxS9PveexPzQweYo7XL4lA_HE_HP1nd";
const db = createClient(SUPA_URL, SUPA_KEY, { realtime: { params: { eventsPerSecond: 5 } } });

const MOOD_EMOJI = {
  지침: "😮‍💨", 불안: "😰", 외로움: "🥀", 슬픔: "💧", 분노: "🔥", 무기력: "🌫️", 막막: "🧭",
};

// ── 익명 닉네임 생성 ─────────────────────────
const ADJ = ["따뜻한","조용한","느린","다정한","작은","포근한","늦은","단단한","느긋한","부드러운","수줍은","환한"];
const NOUN = ["별","달","구름","바람","등불","비","노을","뿌리","새벽","파도","안개","별빛"];
function makeNickname() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return `${a} ${n} #${Math.floor(1000 + Math.random() * 8999)}`;
}

// ── 상태 ─────────────────────────────────────
let nickname = localStorage.getItem("mh_nick") || makeNickname();
if (!localStorage.getItem("mh_nick")) localStorage.setItem("mh_nick", nickname);
let mood = "지침";

// ── DOM ──────────────────────────────────────
const $ = (s) => document.querySelector(s);
const bodyEl = $("#body"), countEl = $("#count"), submitEl = $("#submit");
const nickNameEl = $("#nickName"), nickBtn = $("#nickBtn");
const feedEl = $("#feed"), emptyEl = $("#empty"), toastEl = $("#toast");
nickNameEl.textContent = nickname;

// ── 별 배경 생성 ─────────────────────────────
(function paintStars() {
  const layer = $("#stars");
  const n = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 18 : 60;
  let html = "";
  for (let i = 0; i < n; i++) {
    const size = Math.random() < 0.85 ? 2 : 3;
    const top = Math.random() * 100, left = Math.random() * 100;
    const delay = (Math.random() * 5).toFixed(2), dur = (3 + Math.random() * 4).toFixed(2);
    const op = (0.3 + Math.random() * 0.5).toFixed(2);
    html += `<span class="star" style="top:${top}%;left:${left}%;width:${size}px;height:${size}px;opacity:${op};--tw:${dur}s;animation-delay:${delay}s"></span>`;
  }
  layer.innerHTML = html;
})();

// ── 시간 표시 ────────────────────────────────
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 604800) return `${Math.floor(s / 86400)}일 전`;
  return new Date(d).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

// ── 토스트 ───────────────────────────────────
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ── 닉네임 다시 뽑기 ─────────────────────────
nickBtn.addEventListener("click", () => {
  nickname = makeNickname();
  localStorage.setItem("mh_nick", nickname);
  nickNameEl.textContent = nickname;
  toast("새 익명 이름을 뽑았어요");
});

// ── 감정 선택 ────────────────────────────────
document.querySelectorAll(".mood").forEach((btn) => {
  if (btn.dataset.mood === mood) btn.setAttribute("aria-pressed", "true");
  btn.addEventListener("click", () => {
    mood = btn.dataset.mood;
    document.querySelectorAll(".mood").forEach((b) => b.removeAttribute("aria-pressed"));
    btn.setAttribute("aria-pressed", "true");
  });
});

// ── 작성 폼 ──────────────────────────────────
function syncForm() {
  const len = bodyEl.value.trim().length;
  countEl.textContent = `${bodyEl.value.length} / 500`;
  submitEl.disabled = len < 1;
}
bodyEl.addEventListener("input", syncForm);
syncForm();

submitEl.addEventListener("click", async () => {
  const text = bodyEl.value.trim();
  if (!text) return;
  submitEl.disabled = true;
  submitEl.textContent = "내려놓는 중…";
  try {
    const { data, error } = await db
      .from("confessions")
      .insert({ body: text, mood, nickname })
      .select()
      .single();
    if (error) throw error;
    feedEl.prepend(renderCard(data));
    toggleEmpty();
    bodyEl.value = "";
    syncForm();
    toast("마음이 밤하늘에 떴어요");
  } catch (e) {
    toast("잠시 오류가 났어요. 다시 시도해 주세요");
    submitEl.disabled = false;
  }
  submitEl.textContent = "마음 내려놓기";
});

// ── 카드 렌더링 ──────────────────────────────
function renderCard(c) {
  const el = document.createElement("article");
  el.className = "card";
  el.id = `c-${c.id}`;
  el.dataset.id = c.id;
  el.dataset.count = c.comfort_count ?? 0;
  el.innerHTML = `
    <div class="card__top">
      <span class="card__emoji">${MOOD_EMOJI[c.mood] ?? "✦"}</span>
      <span class="card__nick">${escapeHtml(c.nickname)}</span>
      <span class="card__mood">${escapeHtml(c.mood)}</span>
      <span class="card__time" data-ts="${c.created_at}">${timeAgo(c.created_at)}</span>
    </div>
    <p class="card__body">${escapeHtml(c.body)}</p>
    <div class="constellation">
      <span class="constellation__dots"></span>
      <span class="constellation__count"></span>
    </div>
    <div class="card__actions">
      <button class="btn-ghost" type="button" aria-expanded="false">위로 남기기 · 보기</button>
    </div>
    <div class="comforts" hidden></div>`;
  updateConstellation(el, c.comfort_count ?? 0);
  const toggle = el.querySelector(".btn-ghost");
  toggle.addEventListener("click", () => toggleComforts(el, toggle));
  return el;
}

function updateConstellation(cardEl, count) {
  const dotsWrap = cardEl.querySelector(".constellation__dots");
  const countEl2 = cardEl.querySelector(".constellation__count");
  cardEl.dataset.count = count;
  const MAX = 8;
  const filled = Math.min(count, MAX);
  let dots = "";
  for (let i = 0; i < filled; i++) dots += `<span class="const-dot"></span>`;
  for (let i = filled; i < MAX; i++) dots += `<span class="const-empty"></span>`;
  dotsWrap.innerHTML = dots;
  countEl2.innerHTML = count > 0
    ? `<b>${count}</b>개의 위로가 닿았어요`
    : "아직 닿은 위로가 없어요. 처음으로 전해볼까요?";
}

// ── 위로 영역 열기/닫기 + 로드 ───────────────
const loaded = new Set();
async function toggleComforts(cardEl, toggle) {
  const wrap = cardEl.querySelector(".comforts");
  const open = toggle.getAttribute("aria-expanded") === "true";
  if (open) {
    wrap.classList.remove("open");
    wrap.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    return;
  }
  if (!loaded.has(cardEl.dataset.id)) {
    wrap.innerHTML = comfortFormHTML() + `<div class="comforts__list"><p class="comforts__none">불러오는 중…</p></div>`;
  }
  wrap.hidden = false;
  wrap.classList.add("open");
  toggle.setAttribute("aria-expanded", "true");
  if (!loaded.has(cardEl.dataset.id)) {
    loaded.add(cardEl.dataset.id);
    await loadComforts(cardEl);
  }
  wireComfortForm(cardEl);
}

function comfortFormHTML() {
  return `<div class="comforts__form">
    <input class="comforts__input" maxlength="300" placeholder="따뜻한 한마디를 전해주세요 (익명)" />
    <button class="comforts__send" type="button" disabled>전하기</button>
  </div>`;
}

async function loadComforts(cardEl) {
  const id = cardEl.dataset.id;
  const list = cardEl.querySelector(".comforts__list");
  const { data, error } = await db
    .from("comforts")
    .select("id,body,nickname,created_at")
    .eq("confession_id", id)
    .order("created_at", { ascending: true });
  if (error) { list.innerHTML = `<p class="comforts__none">불러오지 못했어요.</p>`; return; }
  if (!data.length) { list.innerHTML = `<p class="comforts__none">아직 닿은 위로가 없어요. 처음으로 전해보세요.</p>`; return; }
  list.innerHTML = data.map(renderComfort).join("");
}

function renderComfort(c) {
  return `<div class="comfort" id="k-${c.id}" data-ts="${c.created_at}">
    <div class="comfort__nick">${escapeHtml(c.nickname)} <span>${timeAgo(c.created_at)}</span></div>
    <p class="comfort__body">${escapeHtml(c.body)}</p>
  </div>`;
}

function wireComfortForm(cardEl) {
  if (cardEl.querySelector(".comforts__send")?.dataset.wired) return;
  const input = cardEl.querySelector(".comforts__input");
  const send = cardEl.querySelector(".comforts__send");
  send.dataset.wired = "1";
  input.addEventListener("input", () => { send.disabled = input.value.trim().length < 1; });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.click(); } });
  send.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      const { data, error } = await db
        .from("comforts")
        .insert({ confession_id: Number(cardEl.dataset.id), body: text, nickname })
        .select("id,body,nickname,created_at")
        .single();
      if (error) throw error;
      appendComfort(cardEl, data);
      input.value = "";
      send.disabled = true;
      toast("따뜻한 위로를 전했어요");
    } catch (e) {
      toast("전송에 실패했어요. 다시 시도해 주세요");
      send.disabled = false;
    }
  });
}

function appendComfort(cardEl, c) {
  const list = cardEl.querySelector(".comforts__list");
  const none = list.querySelector(".comforts__none");
  if (none) list.innerHTML = "";
  if (document.getElementById(`k-${c.id}`)) return;
  list.insertAdjacentHTML("beforeend", renderComfort(c));
  const count = (Number(cardEl.dataset.count) || 0) + 1;
  updateConstellation(cardEl, count);
}

// ── 초기 피드 로드 ────────────────────────────
async function loadFeed() {
  const { data, error } = await db
    .from("confessions")
    .select("id,body,mood,nickname,comfort_count,created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) { toast("글을 불러오지 못했어요"); return; }
  feedEl.innerHTML = "";
  data.forEach((c) => feedEl.appendChild(renderCard(c)));
  toggleEmpty();
}

function toggleEmpty() {
  emptyEl.hidden = feedEl.children.length > 0;
}

// ── 실시간 구독 ──────────────────────────────
db.channel("confessions-live")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "confessions" }, (payload) => {
    const c = payload.new;
    if (document.getElementById(`c-${c.id}`)) return; // 내 글 중복 방지
    feedEl.prepend(renderCard(c));
    toggleEmpty();
  })
  .subscribe();

db.channel("comforts-live")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "comforts" }, (payload) => {
    const k = payload.new;
    const cardEl = document.getElementById(`c-${k.confession_id}`);
    if (!cardEl) return;
    if (loaded.has(String(k.confession_id))) {
      appendComfort(cardEl, k);
    } else {
      const count = (Number(cardEl.dataset.count) || 0) + 1;
      updateConstellation(cardEl, count);
    }
  })
  .subscribe();

// ── 시간 주기적 갱신 ─────────────────────────
setInterval(() => {
  document.querySelectorAll(".card__time").forEach((t) => {
    if (t.dataset.ts) t.textContent = timeAgo(t.dataset.ts);
  });
  document.querySelectorAll(".comfort__nick span").forEach((t) => {
    const c = t.closest(".comfort");
    if (c?.dataset?.ts) t.textContent = timeAgo(c.dataset.ts);
  });
}, 30000);

// ── HTML 이스케이프 ──────────────────────────
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

loadFeed();
