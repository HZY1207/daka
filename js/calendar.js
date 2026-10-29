/**
 * calendar.js —— 当月月历 + 历史日期就地展开面板
 * 周一为每周第一天;未来日期不可打卡;非本月日期只作占位。
 */

import {
  state,
  keyOf,
  parseKey,
  todayKey,
  doneItems,
  isItemDone,
  WEEKDAYS,
} from "./model.js";

let ctx = null;
let titleEl = null;
let gridEl = null;
let panelEl = null;

export function initCalendar(context) {
  ctx = context;
  titleEl = document.getElementById("calTitle");
  gridEl = document.getElementById("calGrid");
  panelEl = document.getElementById("dayPanel");

  document.getElementById("prevMonth").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("nextMonth").addEventListener("click", () => shiftMonth(1));
  document.getElementById("goToday").addEventListener("click", goToday);

  gridEl.addEventListener("click", (event) => {
    const cell = event.target.closest(".cal-cell");
    if (!cell || cell.disabled) return;
    const key = cell.dataset.date;
    if (!key) return;

    const opening = state.selected !== key;
    state.selected = opening ? key : null;
    renderCalendar();

    if (opening) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelEl.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
  });

  panelEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-act='close']")) {
      state.selected = null;
      renderCalendar();
      return;
    }
    const row = event.target.closest(".day-row");
    if (row && state.selected) ctx.toggle(state.selected, row.dataset.id);
  });
}

export function shiftMonth(delta) {
  const { year, month } = state.view;
  const d = new Date(year, month + delta, 1);
  state.view = { year: d.getFullYear(), month: d.getMonth() };
  state.selected = null;
  ctx.refresh();
}

export function goToday() {
  const now = new Date();
  state.view = { year: now.getFullYear(), month: now.getMonth() };
  state.selected = null;
  ctx.refresh();
}

export function renderCalendar() {
  const { year, month } = state.view;
  titleEl.textContent = `${year} 年 ${month + 1} 月`;

  const today = todayKey();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 周一为一周起点
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;

  const frag = document.createDocumentFragment();

  for (let i = 0; i < total; i += 1) {
    const date = new Date(year, month, 1 - offset + i);
    const key = keyOf(date);
    const inMonth = date.getMonth() === month;
    const future = key > today;
    const done = doneItems(key);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell";
    cell.dataset.date = key;
    cell.disabled = !inMonth || future;

    if (!inMonth) cell.classList.add("is-outside");
    if (key === today) cell.classList.add("is-today");
    if (future) cell.classList.add("is-future");
    if (key === state.selected) cell.classList.add("is-selected");
    if (key === today) cell.setAttribute("aria-current", "date");

    const label = `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
    cell.setAttribute(
      "aria-label",
      done.length ? `${label},已完成 ${done.length} 项` : `${label},没有打卡`
    );

    const day = document.createElement("span");
    day.className = "day";
    day.textContent = String(date.getDate());
    cell.append(day);

    const dots = document.createElement("span");
    dots.className = "cell-dots";
    dots.setAttribute("aria-hidden", "true");

    if (done.length > 6) {
      // 超过 6 个只显示数字
      const more = document.createElement("span");
      more.className = "cell-more";
      more.textContent = String(done.length);
      dots.append(more);
    } else {
      for (const item of done) {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.style.setProperty("--slot", `var(--${item.color})`);
        dots.append(dot);
      }
    }
    cell.append(dots);

    frag.append(cell);
  }

  gridEl.replaceChildren(frag);
  renderPanel();
}

function renderPanel() {
  const key = state.selected;

  if (!key) {
    panelEl.hidden = true;
    panelEl.replaceChildren();
    return;
  }

  const date = parseKey(key);
  const isToday = key === todayKey();

  const head = document.createElement("div");
  head.className = "day-panel-head";

  const title = document.createElement("span");
  title.className = "day-panel-title";
  title.textContent = `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${
    WEEKDAYS[date.getDay()]
  }${isToday ? " · 今天" : ""}`;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "text-btn";
  closeBtn.dataset.act = "close";
  closeBtn.textContent = "收起";

  head.append(title, closeBtn);

  const list = document.createElement("div");
  list.className = "day-list";

  if (!state.items.length) {
    const note = document.createElement("p");
    note.className = "empty";
    note.textContent = "还没有打卡项";
    list.append(note);
  } else {
    for (const item of state.items) {
      const done = isItemDone(key, item.id);
      const row = document.createElement("button");
      row.type = "button";
      row.className = done ? "day-row is-done" : "day-row";
      row.dataset.id = item.id;
      row.style.setProperty("--slot", `var(--${item.color})`);
      row.setAttribute("aria-pressed", String(done));

      const check = document.createElement("span");
      check.className = "check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";

      const emoji = document.createElement("span");
      emoji.className = "day-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = item.emoji;

      const name = document.createElement("span");
      name.className = "day-name";
      name.textContent = item.name || "未命名";

      row.append(check, emoji, name);
      list.append(row);
    }
  }

  panelEl.hidden = false;
  panelEl.replaceChildren(head, list);
}
