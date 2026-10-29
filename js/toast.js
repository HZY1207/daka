/**
 * toast.js —— 底部轻提示 + 撤销
 * 4 秒后自动消失;再次触发会替换内容并重置计时。
 */

const el = document.getElementById("toast");
const textEl = document.getElementById("toastText");
const undoBtn = document.getElementById("toastUndo");

let timer = 0;
let hideTimer = 0;
let undoHandler = null;

function clearTimers() {
  clearTimeout(timer);
  clearTimeout(hideTimer);
}

function hide() {
  clearTimers();
  el.classList.remove("is-in");
  hideTimer = window.setTimeout(() => {
    el.hidden = true;
    undoHandler = null;
  }, 200);
}

export function showToast(text, onUndo) {
  clearTimers();

  textEl.textContent = text;
  undoHandler = typeof onUndo === "function" ? onUndo : null;
  undoBtn.hidden = !undoHandler;

  el.hidden = false;
  // 强制回流,保证从隐藏态重新播放淡入
  void el.offsetWidth;
  el.classList.add("is-in");

  timer = window.setTimeout(hide, 4000);
}

undoBtn.addEventListener("click", () => {
  const fn = undoHandler;
  undoHandler = null;
  hide();
  if (fn) fn();
});
