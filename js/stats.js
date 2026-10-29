/**
 * stats.js —— 统计数字 + 最近 84 天热力图
 * 连续天数按全局口径(截止今天);完成率跟随当前查看的月份。
 */

import {
  state,
  todayKey,
  shiftKey,
  keyOf,
  parseKey,
  isItemDone,
  isFullDay,
  fullStreak,
  WEEKDAYS,
} from "./model.js";

const HEAT_DAYS = 84;
const HEAT_WEEKS = 12;

export function renderStats() {
  setValue(document.getElementById("statStreak"), fullStreak(), "天");
  setValue(document.getElementById("statBest"), longestStreak(), "天");

  const rate = monthRate(state.view.year, state.view.month);
  setValue(document.getElementById("statRate"), rate === null ? "—" : rate, rate === null ? "" : "%");

  const label = document.getElementById("statRateLabel");
  if (label) {
    const now = new Date();
    const isThisMonth =
      state.view.year === now.getFullYear() && state.view.month === now.getMonth();
    label.textContent = isThisMonth ? "本月完成率" : `${state.view.month + 1} 月完成率`;
  }

  renderHeatmap();
}

function setValue(el, value, unit) {
  if (!el) return;
  el.replaceChildren(document.createTextNode(String(value)));
  if (!unit) return;
  const span = document.createElement("span");
  span.className = "stat-unit";
  span.textContent = unit;
  el.append(span);
}

/* ---------------- 历史最长连续 ---------------- */

function longestStreak() {
  const from = earliestKey();
  if (!from) return 0;

  const today = todayKey();
  let run = 0;
  let best = 0;

  for (let key = from; key <= today; key = shiftKey(key, 1)) {
    if (isFullDay(key)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function earliestKey() {
  let min = null;
  for (const key of Object.keys(state.records)) {
    if (!min || key < min) min = key;
  }
  for (const item of state.items) {
    if (!min || item.createdAt < min) min = item.createdAt;
  }
  return min;
}

/* ---------------- 本月完成率 ---------------- */

/**
 * 已完成打卡项次 ÷ (该月已过去天数 × 当天存在的打卡项数)。
 * 未来月份返回 null(显示 —);当天之前还没创建的项不计入分母。
 */
function monthRate(year, month) {
  const today = todayKey();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = keyOf(new Date(year, month, 1));
  const monthEnd = keyOf(new Date(year, month, daysInMonth));

  const endKey = monthEnd < today ? monthEnd : today;
  if (endKey < monthStart) return null;

  let done = 0;
  let total = 0;

  for (let key = monthStart; key <= endKey; key = shiftKey(key, 1)) {
    for (const item of state.items) {
      if (item.createdAt > key) continue;
      total += 1;
      if (isItemDone(key, item.id)) done += 1;
    }
  }

  if (!total) return null;
  return Math.round((done / total) * 100);
}

/* ---------------- 热力图 ---------------- */

function renderHeatmap() {
  const el = document.getElementById("heatmap");
  if (!el) return;

  const today = todayKey();
  const dow = (parseKey(today).getDay() + 6) % 7; // 周一 = 0
  const thisMonday = shiftKey(today, -dow);
  const start = shiftKey(thisMonday, -(HEAT_WEEKS - 1) * 7);

  const frag = document.createDocumentFragment();

  for (let i = 0; i < HEAT_DAYS; i += 1) {
    const key = shiftKey(start, i);
    const date = parseKey(key);
    const cell = document.createElement("i");
    cell.className = "heat-cell";

    if (key > today) {
      cell.classList.add("is-future");
      cell.title = `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${WEEKDAYS[date.getDay()]} · 未到`;
      frag.append(cell);
      continue;
    }

    const active = state.items.filter((item) => item.createdAt <= key);
    const done = active.filter((item) => isItemDone(key, item.id)).length;
    const total = active.length;
    const level = heatLevel(done, total);

    if (level) cell.style.setProperty("--v", [0, 0.3, 0.55, 0.85][level]);

    const detail = total ? `${done}/${total} 项` : "无打卡项";
    cell.title = `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${WEEKDAYS[date.getDay()]} · ${detail}`;
    frag.append(cell);
  }

  el.replaceChildren(frag);
}

/** 0 / 1-33% / 34-66% / 67-100% 四档,用整数比较避免浮点误差 */
function heatLevel(done, total) {
  if (!total || done === 0) return 0;
  if (done * 3 <= total) return 1;
  if (done * 3 <= total * 2) return 2;
  return 3;
}
