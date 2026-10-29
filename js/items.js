/**
 * items.js —— 打卡项 chip 与编辑面板
 * 编辑态:点 chip 打开下方内联编辑器(改名 / 换 emoji / 换色 / 删除)。
 */

import {
  state,
  todayKey,
  isItemDone,
  itemStreak,
  addItem,
  updateItem,
  deleteItem,
  SLOTS,
} from "./model.js";

let ctx = null;
let chipsEl = null;
let emptyEl = null;
let toggleBtn = null;
let addBtn = null;
let editorEl = null;

export function initItems(context) {
  ctx = context;
  chipsEl = document.getElementById("chips");
  emptyEl = document.getElementById("itemsEmpty");
  toggleBtn = document.getElementById("editToggle");
  addBtn = document.getElementById("addItem");
  editorEl = document.getElementById("itemEditor");

  toggleBtn.addEventListener("click", () => {
    state.editing = !state.editing;
    state.editingId = null;
    renderItems();
  });

  addBtn.addEventListener("click", handleAdd);

  chipsEl.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    if (state.editing) {
      state.editingId = chip.dataset.id;
      renderEditor();
      return;
    }
    ctx.toggle(todayKey(), chip.dataset.id);
  });
}

export function renderItems() {
  const today = todayKey();

  chipsEl.replaceChildren(...state.items.map((item) => chipEl(item, today)));
  chipsEl.classList.toggle("is-editing", state.editing);

  emptyEl.hidden = state.items.length > 0;
  addBtn.hidden = !state.editing;

  toggleBtn.textContent = state.editing ? "完成" : "编辑";
  toggleBtn.setAttribute("aria-pressed", String(state.editing));

  renderEditor();
}

function chipEl(item, today) {
  const done = isItemDone(today, item.id);
  const streak = itemStreak(item.id);
  const label = item.name || "未命名";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip";
  if (done) btn.classList.add("is-done");
  if (state.editing) btn.classList.add("is-editing");
  btn.dataset.id = item.id;
  btn.style.setProperty("--slot", `var(--${item.color})`);
  btn.setAttribute("aria-pressed", String(done));
  btn.setAttribute(
    "aria-label",
    `${label},${done ? "今天已打卡" : "今天未打卡"},连续 ${streak} 天`
  );

  const dot = document.createElement("span");
  dot.className = "chip-dot";
  dot.setAttribute("aria-hidden", "true");

  const emoji = document.createElement("span");
  emoji.className = "chip-emoji";
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = item.emoji;

  const name = document.createElement("span");
  name.className = "chip-name";
  name.textContent = label;

  const streakEl = document.createElement("span");
  streakEl.className = "chip-streak";
  streakEl.textContent = `${streak} 天`;

  btn.append(dot, emoji, name, streakEl);

  if (state.editing) {
    const pen = document.createElement("span");
    pen.className = "chip-pen";
    pen.setAttribute("aria-hidden", "true");
    pen.textContent = "✎";
    btn.append(pen);
  }

  return btn;
}

/* ---------------- 编辑面板 ---------------- */

function renderEditor() {
  const item = state.editingId
    ? state.items.find((i) => i.id === state.editingId)
    : null;

  if (!item) {
    editorEl.hidden = true;
    editorEl.replaceChildren();
    return;
  }

  editorEl.hidden = false;
  editorEl.replaceChildren(buildEditor(item));
}

function buildEditor(item) {
  const frag = document.createDocumentFragment();

  const head = document.createElement("div");
  head.className = "editor-head";
  const title = document.createElement("span");
  title.className = "editor-title";
  title.textContent = "编辑打卡项";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "text-btn";
  closeBtn.textContent = "完成";
  closeBtn.addEventListener("click", () => {
    state.editingId = null;
    renderEditor();
  });
  head.append(title, closeBtn);

  const row = document.createElement("div");
  row.className = "editor-row";

  const emojiInput = document.createElement("input");
  emojiInput.id = "fEmoji";
  emojiInput.className = "field field-emoji";
  emojiInput.type = "text";
  emojiInput.value = item.emoji;
  emojiInput.maxLength = 4;
  emojiInput.setAttribute("aria-label", "图标");
  emojiInput.addEventListener("input", () => {
    const updated = updateItem(item.id, { emoji: emojiInput.value });
    if (updated) patchChip(updated);
  });

  const nameInput = document.createElement("input");
  nameInput.id = "fName";
  nameInput.className = "field";
  nameInput.type = "text";
  nameInput.value = item.name;
  nameInput.maxLength = 12;
  nameInput.placeholder = "名称";
  nameInput.setAttribute("aria-label", "名称");
  nameInput.addEventListener("input", () => {
    const updated = updateItem(item.id, { name: nameInput.value });
    if (updated) patchChip(updated);
  });
  nameInput.addEventListener("blur", () => {
    if (nameInput.value.trim()) return;
    nameInput.value = "未命名";
    const updated = updateItem(item.id, { name: "未命名" });
    if (updated) patchChip(updated);
  });

  row.append(emojiInput, nameInput);

  const slots = document.createElement("div");
  slots.className = "slot-row";
  slots.setAttribute("role", "group");
  slots.setAttribute("aria-label", "颜色");

  SLOTS.forEach((slot, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.dataset.color = slot;
    btn.style.setProperty("--slot", `var(--${slot})`);
    btn.setAttribute("aria-label", `颜色 ${index + 1}`);
    btn.setAttribute("aria-pressed", String(item.color === slot));
    const swatch = document.createElement("span");
    swatch.setAttribute("aria-hidden", "true");
    btn.append(swatch);
    btn.addEventListener("click", () => {
      updateItem(item.id, { color: slot });
      renderItems();
    });
    slots.append(btn);
  });

  const foot = document.createElement("div");
  foot.className = "editor-foot";
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "text-btn danger";
  delBtn.textContent = "删除";
  delBtn.addEventListener("click", () => {
    const label = item.name || "未命名";
    if (!window.confirm(`删除「${label}」会同时删除它的历史打卡记录,确定吗?`)) return;
    deleteItem(item.id);
    state.editingId = null;
    ctx.refresh();
  });
  foot.append(delBtn);

  frag.append(head, row, slots, foot);
  return frag;
}

function patchChip(item) {
  const chip = [...chipsEl.children].find((el) => el.dataset.id === item.id);
  if (!chip) return;
  chip.querySelector(".chip-name").textContent = item.name || "未命名";
  chip.querySelector(".chip-emoji").textContent = item.emoji;
  chip.style.setProperty("--slot", `var(--${item.color})`);
}

function handleAdd() {
  const item = addItem();
  state.editingId = item.id;
  renderItems();

  const input = editorEl.querySelector("#fName");
  if (input) {
    input.focus();
    input.select();
  }
}
