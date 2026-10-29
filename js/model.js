/**
 * model.js —— 数据模型与派生计算
 * 只负责"数据是什么",不碰 DOM。
 *
 * 记录结构:{ "YYYY-MM-DD": ["itemId", ...] },只存已完成项。
 * 日期键一律用本地时间生成,不用 toISOString(),避免跨时区错天。
 */

import { KEYS, readRaw, writeRaw } from "./storage.js";

const SCHEMA = 1;

export const SLOTS = ["c1", "c2", "c3", "c4", "c5", "c6"];
export const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/* ================= 日期工具 ================= */

export function keyOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return keyOf(new Date());
}

/** 在日期键上加减天数(自动跨月跨年) */
export function shiftKey(key, days) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return keyOf(d);
}

function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseKey(value);
  return !Number.isNaN(d.getTime()) && keyOf(d) === value;
}

/* ================= 运行态 ================= */

export const state = {
  items: [],
  records: {},
  /** 当前查看的月份(0-11) */
  view: { year: 0, month: 0 },
  /** 月历下方展开的日期键 */
  selected: null,
  editing: false,
  editingId: null,
};

/* ================= 读写 ================= */

function persistItems() {
  writeRaw(KEYS.items, state.items);
}

function persistRecords() {
  writeRaw(KEYS.records, state.records);
}

export function load() {
  const schema = readRaw(KEYS.schema, null);

  if (schema === null) {
    seed();
  } else {
    state.items = sanitizeItems(readRaw(KEYS.items, []));
    state.records = sanitizeRecords(readRaw(KEYS.records, {}), state.items);
  }

  const now = new Date();
  state.view = { year: now.getFullYear(), month: now.getMonth() };
}

function seed() {
  const t = todayKey();
  // 示例项按"89 天前就存在"处理,这样补卡能立刻算出连续天数
  const since = shiftKey(t, -89);
  state.items = [
    { id: "i_sport", name: "运动", emoji: "🏃", color: "c1", createdAt: since },
    { id: "i_read", name: "读书", emoji: "📖", color: "c2", createdAt: since },
    { id: "i_sleep", name: "早睡", emoji: "🌙", color: "c4", createdAt: since },
  ];
  state.records = {};
  persistItems();
  persistRecords();
  writeRaw(KEYS.schema, SCHEMA);
}

function sanitizeItems(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" && raw.id ? raw.id : uid();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: typeof raw.name === "string" ? raw.name.slice(0, 12) : "打卡项",
      emoji:
        typeof raw.emoji === "string" && raw.emoji
          ? Array.from(raw.emoji).slice(0, 2).join("")
          : "✅",
      color: SLOTS.includes(raw.color) ? raw.color : SLOTS[out.length % SLOTS.length],
      createdAt: isDateKey(raw.createdAt) ? raw.createdAt : todayKey(),
    });
  }
  return out;
}

function sanitizeRecords(raw, items) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;

  const ids = new Set(items.map((i) => i.id));
  for (const [key, value] of Object.entries(raw)) {
    if (!isDateKey(key) || !Array.isArray(value)) continue;
    const list = [...new Set(value.filter((id) => typeof id === "string" && ids.has(id)))];
    if (list.length) out[key] = list;
  }
  return out;
}

function uid() {
  return `i_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 导入用:整体替换数据(经过同样的清洗,避免脏数据) */
export function replaceAll(itemsRaw, recordsRaw) {
  state.items = sanitizeItems(itemsRaw);
  state.records = sanitizeRecords(recordsRaw, state.items);
  persistItems();
  persistRecords();
  writeRaw(KEYS.schema, SCHEMA);
}

/* ================= 查询 ================= */

export function getItem(id) {
  return state.items.find((i) => i.id === id) || null;
}

export function isItemDone(dateKey, itemId) {
  const list = state.records[dateKey];
  return Array.isArray(list) && list.includes(itemId);
}

/** 某天已完成的打卡项(按打卡项顺序,用于月历圆点) */
export function doneItems(dateKey) {
  const list = state.records[dateKey];
  if (!Array.isArray(list)) return [];
  return state.items.filter((i) => list.includes(i.id));
}

/**
 * 某天是否"全勤":该日所有已存在的打卡项都完成。
 * createdAt 晚于该日的项不参与判定,避免新增一项就打断历史连续。
 */
export function isFullDay(dateKey) {
  const active = state.items.filter((i) => i.createdAt <= dateKey);
  if (!active.length) return false;
  return active.every((i) => isItemDone(dateKey, i.id));
}

/** 全勤连续天数:必须包含今天,今天没全勤即为 0 */
export function fullStreak() {
  let n = 0;
  let key = todayKey();
  while (isFullDay(key)) {
    n += 1;
    key = shiftKey(key, -1);
  }
  return n;
}

/** 单项连续天数:必须包含今天;只看该项自己的记录,不看 createdAt */
export function itemStreak(itemId) {
  if (!getItem(itemId)) return 0;
  let n = 0;
  let key = todayKey();
  while (isItemDone(key, itemId)) {
    n += 1;
    key = shiftKey(key, -1);
  }
  return n;
}

/* ================= 写操作(返回撤销快照) ================= */

export function toggleCheck(dateKey, itemId) {
  const before = [...(state.records[dateKey] || [])];
  const has = before.includes(itemId);
  const after = has ? before.filter((id) => id !== itemId) : [...before, itemId];

  if (after.length) state.records[dateKey] = after;
  else delete state.records[dateKey];

  persistRecords();
  return { dateKey, itemId, before };
}

export function undoCheck(snapshot) {
  if (!snapshot) return;
  if (snapshot.before.length) state.records[snapshot.dateKey] = [...snapshot.before];
  else delete state.records[snapshot.dateKey];
  persistRecords();
}

export function addItem() {
  const used = new Set(state.items.map((i) => i.color));
  const color = SLOTS.find((s) => !used.has(s)) || SLOTS[state.items.length % SLOTS.length];
  const item = {
    id: uid(),
    name: "新打卡项",
    emoji: "✅",
    color,
    createdAt: todayKey(),
  };
  state.items.push(item);
  persistItems();
  return item;
}

export function updateItem(id, patch) {
  const item = getItem(id);
  if (!item) return null;

  if (typeof patch.name === "string") item.name = patch.name.slice(0, 12);
  if (typeof patch.emoji === "string") {
    item.emoji = Array.from(patch.emoji).slice(0, 2).join("") || "✅";
  }
  if (SLOTS.includes(patch.color)) item.color = patch.color;

  persistItems();
  return item;
}

/** 删除打卡项:连同它的历史记录一起删掉 */
export function deleteItem(id) {
  const index = state.items.findIndex((i) => i.id === id);
  if (index < 0) return;

  state.items.splice(index, 1);
  persistItems();

  let recordsChanged = false;
  for (const key of Object.keys(state.records)) {
    const list = state.records[key];
    if (!list.includes(id)) continue;
    const next = list.filter((x) => x !== id);
    if (next.length) state.records[key] = next;
    else delete state.records[key];
    recordsChanged = true;
  }
  if (recordsChanged) persistRecords();
}
