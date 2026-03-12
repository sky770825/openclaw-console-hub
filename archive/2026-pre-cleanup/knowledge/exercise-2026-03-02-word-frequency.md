# E-3 范例答案：词频统计

> 题库 E（代码能力）第 3 题
> 日期：2026-03-02
> 工具：code_eval action（沙盒 JS 执行）

---

## 题目重述

给定一段文字（可能是 JSON 字符串或日志），要求：
1. 清除标点符号，提取所有「词」
2. 统计每个词出现的次数
3. 输出词频表

---

## code_eval 实际代码

```javascript
const text = '{"ok":true,"service":"openclaw-server","version":"2.4.1","uptime":241}';

// Step 1: 把 JSON 标点换成空格，再 split 成词
const words = text.replace(/[{}":,]/g, ' ').trim().split(/\s+/);

// Step 2: 用 Map 统计词频
const freq = new Map();
for (const w of words) {
  freq.set(w, (freq.get(w) || 0) + 1);
}

// Step 3: 输出结果
console.log('=== 词频统计 ===');
for (const [word, count] of freq) {
  console.log(`${word}: ${count}`);
}

// 附加：按词频降序排列
console.log('\n=== 按频次排序 ===');
const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
for (const [word, count] of sorted) {
  console.log(`${word}: ${count}`);
}
```

---

## 预期输出

```
=== 词频统计 ===
ok: 1
true: 1
service: 1
openclaw-server: 1
version: 1
2.4.1: 1
uptime: 1
241: 1

=== 按频次排序 ===
ok: 1
true: 1
service: 1
openclaw-server: 1
version: 1
2.4.1: 1
uptime: 1
241: 1
```

（这段 JSON 每个词只出现 1 次；若输入含重复词，频次会 > 1）

---

## 学习要点

| 技术 | 说明 |
|------|------|
| `String.replace(/regex/g, ' ')` | 用正则批量替换字符 |
| `String.split(/\s+/)` | 按空白切割，自动处理多余空格 |
| `Map` | 比普通 object 更适合做计数器（key 可以是任意类型） |
| `freq.get(w) \|\| 0` | Map 取不到值时给默认值 0 |
| `[...map.entries()].sort()` | 把 Map 转数组后才能排序 |

**小蔡笔记**：这个模式在分析日志时很有用。
例如把 `/tmp/openclaw-server.log` 的错误信息做词频分析，
就能快速找出最常出现的错误关键词。
