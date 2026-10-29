/**
 * io.js —— 导出 / 导入 JSON
 * 导入前二次确认,导入成功后整页刷新。
 */

import { KEYS, readRaw, writeRaw } from "./storage.js";
import { state, todayKey, replaceAll } from "./model.js";
import { showToast } from "./toast.js";

const THEMES = ["ink", "mist", "sand", "matcha", "night"];

export function initIO() {
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const fileInput = document.getElementById("importFile");
  if (!exportBtn || !importBtn || !fileInput) return;

  exportBtn.addEventListener("click", exportJson);
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFile);
}

function exportJson() {
  const payload = {
    app: "daka",
    schema: 1,
    exportedAt: new Date().toISOString(),
    items: state.items,
    records: state.records,
    theme: readRaw(KEYS.theme, null),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daka-${todayKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast("已导出 JSON");
}

async function handleFile(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = ""; // 允许重复选择同一个文件
  if (!file) return;

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    showToast("导入失败:不是有效的 JSON 文件");
    return;
  }

  const result = validate(data);
  if (!result.ok) {
    showToast(`导入失败:${result.reason}`);
    return;
  }

  const ok = window.confirm(
    `导入会覆盖当前全部数据(${result.items} 个打卡项、${result.days} 天记录),确定吗?`
  );
  if (!ok) return;

  replaceAll(data.items, data.records);
  if (THEMES.includes(data.theme)) writeRaw(KEYS.theme, data.theme);

  location.reload();
}

function validate(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "文件内容不是对象" };
  }
  if (!Array.isArray(data.items)) {
    return { ok: false, reason: "缺少 items 字段" };
  }
  if (
    data.records != null &&
    (typeof data.records !== "object" || Array.isArray(data.records))
  ) {
    return { ok: false, reason: "records 格式不正确" };
  }

  const items = data.items.filter(
    (item) => item && typeof item === "object" && typeof item.id === "string"
  );
  if (!items.length) {
    return { ok: false, reason: "没有任何有效打卡项" };
  }

  return {
    ok: true,
    items: items.length,
    days: data.records ? Object.keys(data.records).length : 0,
  };
}
