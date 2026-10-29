/**
 * storage.js —— localStorage 的唯一出口
 * 所有键统一 daka_ 前缀;读写失败(隐私模式 / 配额满)不抛异常,只告警。
 */

const PREFIX = "daka_";

export const KEYS = {
  schema: `${PREFIX}schema`,
  items: `${PREFIX}items`,
  records: `${PREFIX}records`,
  theme: `${PREFIX}theme`,
};

/** 读取并 JSON.parse;失败或不存在时返回 fallback */
export function readRaw(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[daka] 读取本地数据失败:", key, err);
    return fallback;
  }
}

/** 写入(自动 JSON.stringify);返回是否成功 */
export function writeRaw(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn("[daka] 写入本地数据失败:", key, err);
    return false;
  }
}

export function removeRaw(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("[daka] 删除本地数据失败:", key, err);
  }
}

/** 当前环境是否可用 localStorage(导出/导入前做提示用) */
export function isAvailable() {
  try {
    const probe = `${PREFIX}__probe__`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
