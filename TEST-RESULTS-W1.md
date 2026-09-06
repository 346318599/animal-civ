# W1 T1.5 Smoke Test Results — Desktop Baseline

> **测试目标**：验证 web/ 在桌面 Chrome 100+ / Firefox 100+ / Safari 15+ 浏览器能稳定启动
> Phaser 3、加载 CDN、没有 JS 错误、灰盒对象正常渲染。
>
> **怎么填**：依次打开 <https://346318599.github.io/animal-civ/> 在 3 个浏览器里验证，
> 把 `Console` 截图 / `FPS` 数字 / 看到的视觉元素对应填到下面表格里。

**测试日期**：2026-09-06
**测试 URL**：https://346318599.github.io/animal-civ/
**测试人**：用户本地 + 我（WorkBuddy 内 netcat/curl 验证 CDN）

---

## A. CDN 与页面可达性（自动化部分，WorkBuddy 侧）

| 检查项 | 期望 | 实测 |
|---|---|---|
| HTTP status | `200 OK` | ✅ `200 OK` |
| Server header | `GitHub.com` | ✅ `GitHub.com` |
| Content-Type | `text/html; charset=utf-8` | ✅ |
| Last-Modified | 部署完成时间 | ✅ `2026-09-06 05:36:01 GMT`（13:36 GMT+8） |
| HTML 大小 | < 2 KB | ✅ **971 bytes** |
| CORS (`Access-Control-Allow-Origin`) | `*` | ✅ `*` |
| `.nojekyll` 在根 | 是 | ✅ `animal-civ/.nojekyll`（subtree push 已带过去） |

---

## B. 渲染验证（人工部分，用户在 3 个浏览器跑）

每行 3 个浏览器各跑一次。看到的视觉元素对照打 ✓，Console 错误照抄贴下面。

### B.1 浏览器清单

| # | 浏览器 | 实际版本 | 渲染引擎 | 是否通过 | 备注 |
|---|---|---|---|---|---|
| 1 | Chrome | __填__ | Blink | ☐ ✓ / ☐ ✗ | |
| 2 | Firefox | __填__ | Gecko | ☐ ✓ / ☐ ✗ | |
| 3 | Safari 15+ (macOS only) | __填__ | WebKit | ☐ ✓ / ☐ ✗ | |

💡 **降级建议**：没装 Firefox / Safari，至少跑 Chrome 和 Edge（都是 Chromium，都覆盖 Blink 引擎） —
不算真正的 cross-engine 测试，但能在 W1 baseline 上「够用」。Safari 在 macOS 才能跑，
没有 macOS 设备就跳过这一格（v1.0 上线前找一台 macOS 真机验）。

### B.2 视觉元素清单（每浏览器各跑一次）

每行看到 → ✓，看不到 → ✗。

| 元素 | Chrome | Firefox | Safari |
|---|---|---|---|
| 1. 背景为黑色 `#1a1a1a` | ☐ | ☐ | ☐ |
| 2. 顶部标题 "Animal Civ" 52px 金色 `#d4af37` | ☐ | ☐ | ☐ |
| 3. 副标题 "— 动物文明 / Web 单机 Roguelike" 浅灰 `#999` | ☐ | ☐ | ☐ |
| 4. 5 个圆形阵营单位占位（panda 黑 / wolf 棕 / lion 金 / bear 棕 / parrot 绿） | ☐ | ☐ | ☐ |
| 5. 2 个方形建筑占位（base 蓝 / barracks 橙）| ☐ | ☐ | ☐ |
| 6. 右上角 `#debug` 浮窗显示坐标 / FPS / 阵营高亮 | ☐ | ☐ | ☐ |
| 7. Phaser canvas 居中放大到 16:9（不是像素 1:1） | ☐ | ☐ | ☐ |

### B.3 DevTools Console 检查（每浏览器各跑一次）

**操作步骤**：
1. F12 打开 DevTools
2. 切到 `Console` 标签
3. 刷新页面
4. 看是否有 **红色** 错误（黄色 warning 不算错）

| 检查项 | Chrome | Firefox | Safari |
|---|---|---|---|
| 无红色错误（401 / 404 / TypeError 等） | ☐ | ☐ | ☐ |
| Phaser 3.90 启动 banner 出现（绿字 `[Phaser 3]`） | ☐ | ☐ | ☐ |
| 加载 jsdelivr.net 或 unpkg 路径（看一眼 Network 标签） | ☐ | ☐ | ☐ |

**红色错误完整粘贴**（如有）：
```
[Chrome Console 报错例子]
TypeError: ...
```

### B.4 性能 baseline（每浏览器各跑一次）

**操作步骤**：
1. F12 DevTools → `Performance` 标签
2. 点录制按钮（圆点）
3. 等 5 秒
4. 停止录制
5. 看 summary 里的 `FPS` 或 `frames per second`

| 指标 | Chrome | Firefox | Safari |
|---|---|---|---|
| Average FPS（录 5 秒取均值） | __填__ | __填__ | __填__ |
| Min FPS（录 5 秒看到的最低值）| __填__ | __填__ | __填__ |
| Frame time (ms) | __填__ | __填__ | __填__ |

**目标 baseline**（W1 标准）：
- Desktop 桌面：60 FPS（vsync 上限）
- Frame time < 16.7 ms（60fps 对应）

**W4 触屏 baseline**（W4 T4.6 时再验）：
- 中端 Android 真机（Moto G Power / Galaxy A）：60 FPS 目标，30 FPS 兜底
- Frame time < 33ms

---

## C. 验收结论

**T1.5 通过条件**（必须全 ✓）：
- [ ] A 部分所有项 ✓（CDN / page alive）
- [ ] B.2 视觉清单至少 1 个浏览器全过
- [ ] B.3 至少 1 个浏览器 Console 无错
- [ ] B.4 性能 baseline 桌面 ≥ 55 FPS

**降级场景**：
- 只有 1 个浏览器通过 → W1 baseline 接受（v1.0 ship 前补）
- 2 个浏览器通过 → W1 强接受
- 3 个浏览器全过 → W1 满分

---

## D. 已知限制 + 后续动作

| 限制 | 何时修 | 谁修 |
|---|---|---|
| Cross-engine 测试不完整（Safari / Firefox 没测） | v1.0 ship 前 | 用户找一台 macOS 真机 + Firefox |
| 未在 W4 触屏真机环境（Moto G / Galaxy A）回归 | W4 T4.6 | 用户 + 我 |
| 自动化 CI 没接（PR 跑 Playwright 截 3 浏览器图） | v1.0 后 | 我（Vitest + Playwright 集成） |
| 国内 CDN 备份（bootcdn / staticfile） | v1.0 上线前 | 我 |
