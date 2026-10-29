/**
 * shortcuts.js —— 桌面键盘快捷键
 * ← / → 切月,空格打卡今天第一个未完成项,T 回到当月。
 * 焦点在输入框 / 文本域 / 下拉框 / contenteditable 时全部失效。
 */

function isTyping(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

export function initShortcuts({ shiftMonth, goToday, checkFirstPending }) {
  document.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTyping(event.target)) return;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        shiftMonth(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        shiftMonth(1);
        break;
      case " ":
      case "Spacebar":
        event.preventDefault();
        checkFirstPending();
        break;
      case "t":
      case "T":
        event.preventDefault();
        goToday();
        break;
      default:
        break;
    }
  });
}
