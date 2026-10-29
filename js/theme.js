/**
 * theme.js —— 主题切换
 * 首屏由 index.html <head> 里的内联脚本先落 data-theme,避免闪烁;
 * 这里负责交互、持久化和"未手动选择时跟随系统"。
 */

import { KEYS, readRaw, writeRaw, removeRaw } from "./storage.js";

export const THEMES = [
  { id: "ink", label: "极简墨白" },
  { id: "mist", label: "雾蓝" },
  { id: "sand", label: "暖砂" },
  { id: "matcha", label: "抹茶" },
  { id: "night", label: "夜间" },
];

const VALID = THEMES.map((t) => t.id);
const media = window.matchMedia("(prefers-color-scheme: dark)");

/** 用户手动选过的主题;没选过返回 null */
function savedTheme() {
  const v = readRaw(KEYS.theme, null);
  return VALID.includes(v) ? v : null;
}

function systemTheme() {
  return media.matches ? "night" : "ink";
}

function paint(id) {
  document.documentElement.setAttribute("data-theme", id);
  document.querySelectorAll(".theme-dot").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.theme === id));
  });
}

export function setTheme(id, { persist = true } = {}) {
  if (!VALID.includes(id)) return;
  if (persist) writeRaw(KEYS.theme, id);
  else removeRaw(KEYS.theme);
  paint(id);
}

export function initTheme() {
  paint(savedTheme() ?? systemTheme());

  const group = document.getElementById("themeDots");
  if (group) {
    group.addEventListener("click", (event) => {
      const btn = event.target.closest(".theme-dot");
      if (!btn) return;
      setTheme(btn.dataset.theme);
    });
  }

  // 没手动选过时,系统深浅色变化实时跟随
  media.addEventListener("change", () => {
    if (!savedTheme()) paint(systemTheme());
  });
}
