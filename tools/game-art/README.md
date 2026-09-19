# game-art

《Haide 会飞》的美术流水线与 M0 原型。原版 Flappy 玩法，只换美术。

物理跑在 **360×640 逻辑单位**里，资产按 `manifest.renderScale`（当前 3，即 1080×1920）出。
这样调好的手感数值不随资产分辨率变。

## 目录

- `source/` — 生成出来的母版，不要手改。`build.mjs` 只读这里。
- `assets/` — 构建产物 + `manifest.json`，游戏实际加载的就是这套。
- `assets/native/` — Haide 的原生精灵表（571×455/帧），换分辨率时从它重推。
- `prototype/` — M0 原型，单文件 HTML。
- `lib/sharp.mjs` — 从 `website/node_modules` 解析 sharp，并放共用函数。

## 跑法

```bash
node tools/game-art/build.mjs              # source/ -> assets/
node tools/game-art/preview.mjs            # 合成对照图，检查可读性
node tools/game-art/tiletool.mjs seam tools/game-art/assets/L4-hedge.png
node tools/game-art/layercheck.mjs tools/game-art/assets/L6-ground.png
```

原型：`.claude/launch.json` 里的 `game-prototype`，或

```bash
node tools/game-art/prototype/server.mjs --port 4330
```

然后开 <http://127.0.0.1:4330/prototype/>。

## 排行榜

`prototype/server.mjs` 同时发静态文件和排行榜 API：

- `GET /api/scores` → 前 20 名
- `POST /api/scores` `{name, score, durationMs, physics}` → 校验后写入，返回新榜单和你的名次

存储是脚本旁边的 `scores.json`（已 gitignore）。**这不是上线方案**——Vercel 的文件系统是临时的，上线要把 `server.mjs` 里的 `store`（只有 `read` / `write` 两个方法）换成托管 KV（Vercel KV / Upstash / Turso / Supabase），客户端和 API 形状都不用动。

校验：名字剥控制字符、压空白、截断 16 字；分数必须是 0–9999 的整数；按存活时长做宽松的合理性检查；每 IP 每分钟 12 次。**这些是门槛不是安全**——客户端提交的分数本质上可伪造，朋友圈里够用，真要防就得把计分搬到服务端。

名字在**渲染时**转义（`esc()`），不在存储时。已验证 `<img src=x onerror=...>` 存进去后渲染成字面文本、不生成元素。

每条记录连同当时的物理参数一起存，因为 M0 会实时调参——缝隙 260 拿到的 30 分和缝隙 150 的 30 分不是一回事。

## 工具

| 脚本 | 做什么 |
|---|---|
| `build.mjs` | 从母版构建全套资产，含接缝修复，可复现 |
| `slice-sprite.mjs` | 帧带 → 精灵表，按颜色地标配准 |
| `tiletool.mjs` | `seam` `join` `band` `roll` `crop` `down` `edgeclear` `wrapblend` `pitch` |
| `layercheck.mjs` | 逐行明度剖面、最暗像素分布、保留红占比 |
| `preview.mjs` | 按 manifest 合成场地对照图 |

## 踩过的坑

**生图要透明底，就用纯色底自己抠。** 直接要 transparent，模型会**画一张灰白棋盘格**，整图不透明。用 `codex-imagegen` 的 `--key`：主体含绿用蓝底，否则绿底。Haide 用绿底——他有亮蓝眼睛。

**Codex 不认精确尺寸。** `--size 2880x960` 回来是 2172×724，它只守宽高比。`--size` 当比例提示用。

**接缝修复要看图层性质，用错会更糟。**

| 性质 | 手法 | 例 |
|---|---|---|
| 离散物体 | `edgeclear` 删掉压边的整块 | 云 |
| 连续纹理 | `wrapblend` 跨接缝交叉淡化 | 远树冠、草地 |
| 周期结构 | 按周期裁到整数个 | 柱廊 |

柱廊用 `wrapblend` 会从 2.91x **恶化到 32x**——有透明间隙的结构被混合后接缝处 alpha 一边透一边实。按柱距裁时还必须**从完整柱子的左缘起裁**，从被切断的边缘柱子起裁会让包裹后那根比别的窄 18%。

**低倍率会藏住接缝。** 三层在 1× 全部 PASS，到 3× 变 FAIL——降采样把不连续平均掉了。接缝要在最终分辨率上验。

**稀疏图层的接缝指标不可信。** 柱廊 957 列里只有 4 根柱子，"空隙→柱子"的跳变天然落在前 1%，`seam` 会报 98 百分位。这类图层必须 `join` 出拼接图目视确认。

**明度阶梯决定景深，不是细节量。** 远层只要明度带对了，画得糙也读作远。硬规则：**整图最暗的颜色只许在地面和障碍物上**，背景任何植物都不许比它暗。`layercheck` 验的就是这条。

**红色是 Haide 项圈专用。** 40px 下项圈只剩 6–7 个像素，是他唯一的身份标识。障碍物第一版出来是铜管橙，40% 的像素落在红区，重做时钉死五色板才拉回去。`layercheck` 会报保留红占比。

**精灵帧带要按颜色地标配准，不是按格子。** 生成器每格的身体位置差十几像素，缩到 40px 就是 1.5px 抽搐。地标要选在所有帧里刚性的：眼睛 y 漂 1px，项圈 y 漂 31px（翅膀扫下来会挡住一部分）。
