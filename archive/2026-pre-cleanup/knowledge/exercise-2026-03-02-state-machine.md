# E-5 范例答案：状态机

> 题库 E（代码能力）第 5 题
> 日期：2026-03-02
> 工具：code_eval action（沙盒 JS 执行）

---

## 题目重述

实现一个任务状态机，状态转换规则：
- `pending` -> `ready`
- `ready` -> `running`
- `running` -> `done`
- `done` 是终态，不能再转换

要求：
1. 合法转换返回新状态
2. 非法转换抛出错误并说明原因

---

## code_eval 实际代码

```javascript
// 定义合法转换表
const VALID_TRANSITIONS = {
  pending: ['ready'],
  ready:   ['running'],
  running: ['done'],
  done:    [],
};

function transition(current, next) {
  if (!VALID_TRANSITIONS[current]) {
    throw new Error(`Unknown state: ${current}`);
  }
  if (!VALID_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid: ${current} -> ${next}`);
  }
  return next;
}

// --- 正向测试：合法路径 ---
console.log('=== 合法转换 ===');
let state = 'pending';
state = transition(state, 'ready');
console.log(`pending -> ready : ${state}`);

state = transition(state, 'running');
console.log(`ready -> running : ${state}`);

state = transition(state, 'done');
console.log(`running -> done  : ${state}`);

// --- 反向测试：非法路径 ---
console.log('\n=== 非法转换 ===');

try {
  transition('done', 'pending');
} catch (e) {
  console.log(`done -> pending  : ${e.message}`);
}

try {
  transition('ready', 'done');
} catch (e) {
  console.log(`ready -> done    : ${e.message}`);
}

try {
  transition('running', 'pending');
} catch (e) {
  console.log(`running -> pending: ${e.message}`);
}

try {
  transition('banana', 'ready');
} catch (e) {
  console.log(`banana -> ready  : ${e.message}`);
}
```

---

## 预期输出

```
=== 合法转换 ===
pending -> ready : ready
ready -> running : running
running -> done  : done

=== 非法转换 ===
done -> pending  : Invalid: done -> pending
ready -> done    : Invalid: ready -> done
running -> pending: Invalid: running -> pending
banana -> ready  : Unknown state: banana
```

---

## 学习要点

| 概念 | 说明 |
|------|------|
| 状态转换表 | 用 object/Map 定义「从哪里可以到哪里」 |
| 防御式编程 | 未知状态和非法转换都要 throw Error |
| `Array.includes()` | 检查目标状态是否在合法列表中 |
| `try...catch` | 测试错误路径时用 catch 捕获，程序不会中断 |

**小蔡笔记**：OpenClaw 任务板的状态机也是类似逻辑。
实际系统中 `VALID_TRANSITIONS` 更复杂（ready 可以退回 pending、running 可以变 error），
但核心模式一样：查表 -> 合法就转 -> 非法就报错。
理解这个模式，以后读 `server/src/` 里的任务状态逻辑就不会迷路。
