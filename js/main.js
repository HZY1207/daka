/**
 * main.js —— 入口:装配各模块,集中处理"写操作 + 撤销 + 重绘"
 */

import {
  load,
  state,
  todayKey,
  getItem,
  isItemDone,
  toggleCheck,
  undoCheck,
} from "./model.js";
import { initTheme } from "./theme.js";
import { initItems, renderItems } from "./items.js";
import { initCalendar, renderCalendar, shiftMonth, goToday } from "./calendar.js";
import { renderStats } from "./stats.js";
import { initIO } from "./io.js";
import { showToast } from "./toast.js";
import { initShortcuts } from "./shortcuts.js";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function refresh() {
  renderItems();
  renderCalendar();
  renderStats();
}

/** 打卡 / 取消 / 补卡:统一入口,带撤销快照 */
function toggle(dateKey, itemId) {
  const item = getItem(itemId);
  if (!item) return;

  const snapshot = toggleCheck(dateKey, itemId);
  const done = isItemDone(dateKey, itemId);
  refresh();

  const prefix = done ? (dateKey === todayKey() ? "已打卡" : "已补卡") : "已取消";
  showToast(`${prefix} · ${item.name || "未命名"}`, () => {
    undoCheck(snapshot);
    refresh();
  });
}

/** 空格:今天第一个未完成项 */
function checkFirstPending() {
  const today = todayKey();
  if (!state.items.length) {
    showToast("先添加一个打卡项");
    return;
  }
  const pending = state.items.find((item) => !isItemDone(today, item.id));
  if (!pending) {
    showToast("今天已全部完成");
    return;
  }
  toggle(today, pending.id);
}

function renderTodayLabel() {
  const el = document.getElementById("todayLabel");
  if (!el) return;
  const now = new Date();
  el.textContent = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 ${
    WEEKDAYS[now.getDay()]
  }`;
}

function boot() {
  initTheme();
  load();
  renderTodayLabel();

  initItems({ refresh, toggle });
  initCalendar({ refresh, toggle });
  initIO();
  initShortcuts({ shiftMonth, goToday, checkFirstPending });

  refresh();
  registerServiceWorker();
}

/**
 * 本地开发(http://localhost)不注册,避免缓存干扰调试;
 * 线上 https(GitHub Pages)正常注册,updateViaCache 保证 sw.js 自身不被缓存。
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .catch((err) => console.warn("[daka] Service Worker 注册失败:", err));
  });
}

boot();
