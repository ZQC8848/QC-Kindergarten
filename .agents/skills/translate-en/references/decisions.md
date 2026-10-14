# Translation decisions log

Every non-literal choice made by a translation run, newest first. Status is `pending` until QC confirms (`approved`) or replaces (`replaced by …`). Approved reusable terms are copied into [glossary.md](glossary.md).

Format per run:

```
## YYYY-MM-DD — <scope>

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
```

Keep the "为什么" column short: what the Chinese does, what the English does to match. "其他方案" lists the real alternatives considered with one clause on why each lost.

## 2026-10-13 — new character: Laohuang

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 老黄 | Laohuang, "Old Huang" | 名字保留拼音，第一次出现时注一次"Old Huang"，"全园最小的却叫老"这个反差才成立。 | Old Huang（意译成名字，丢掉人名感） | 老黄 bible、config | pending |
| 依弟 / 依妹 | little brother / little sister | 福州话称呼。英文页不能出现汉字，罗马拼写读者看不懂，所以意译，再用一句"the way old men do in Fuzhou"交代出处。 | 保留罗马拼写 Ī-dâi（读者不认识，笑点落空） | 老黄 bible ×5 | pending |
| 王老吉 | Wong Lo Kat | 品牌自己的英文名。通称时用 cooling tea。 | Wanglaoji（拼音，不是品牌官方写法） | 老黄 bible ×8 | pending |
| 别上火，来一罐 / 不上火 | Keep your cool. Have a can. / never loses his cool | "上火"既是中医的热气也是发火，英文 cooling tea 加 keep your cool 刚好也是一语双关。 | Don't get heated（只剩一层意思） | 老黄 bible ×4 | pending |
| 方案 → "荒案" | fang'an → huang'an, "a ridiculous plan" | f/h 不分的同音梗英文无法重现，只能用拼音加一句解释。笑点变弱，但事实保住了。 | 换成英文双关 scheme/scam（不是口音，和福州无关） | 老黄 bible ×1 | pending |
| 七溜八溜，不离福州 / 不离老黄 | Wander seven ways or eight, you never leave Fuzhou / you still end up at Laohuang's | 保留数字的节奏，改写版沿用同一句式。 | All roads lead to Laohuang（太像罗马那句，丢掉福州出处） | 老黄 bible ×3 | pending |
| 凉茶也是茶 | Cooling tea is still tea. | 他的歪理，一句话。 | — | 老黄 bible ×2 | pending |

## 2026-10-13 — side story: Selling Crutches

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 卖拐 | Selling Crutches | 原作小品没有通行英文名，按字面直译，framing 里写明出处。 | The Crutch Con（点破骗局，剧透） | 标题、framing | pending |
| 〔舞台提示〕 | [stage direction] | 英文页不能出现 CJK 标点，〔〕换成方括号。 | — | 全篇 | pending |
| 超棒的主意！ | GREAT idea! | 沿用 Fufu 英文 bible 已有的口头禅写法。 | Super great idea!（和 bible 不一致） | 正文 ×1；顺带修正 Fortuno bible ×1 | pending |
| 心里清楚 / 脑子还不知道 | Deep down he knows / Your brain just hasn't caught up | 骗术的关键是"你心里知道"，英文用 deep down 承接，Fufu 那句反转落在 brain 上。 | in your heart（太抒情） | 正文 ×3 | pending |
| 心里先瘸了，腿就跟着瘸 | Once the mind limps, the leg follows. | 保留"瘸"在心和腿上的双关。 | He limps because he believes it（解释了笑点） | 正文 ×1 | pending |
| 早拄早好 / 晚拄，就得拄一辈子 | The sooner you start, the sooner you're better / Start late, and it's crutches for life | 中文是一对押韵的推销话术，英文用 start 串起两句保持对仗。 | — | 正文 ×2 | pending |

## 2026-10-13 — new character: Qunzhu

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 群主 | Qunzhu, "master of the shoal" | 名字保留拼音（同 Ruanruan、Dianer）。中文里"群主"是群聊管理员的梗，世界内的解释是"鱼群的老大"，英文只译世界内这层，聊天群的梗丢失。 | The Admin（保住网络梗，但世界内"鱼群"那层就没了，也不像名字）；Shoal Boss（意译成名字，丢掉人名感） | 群主 bible ×1、config | pending |
| 小显眼包型 | little-show-off type | "显眼包"是网络用语，指爱出风头又有点傻气的人，show-off 是最近的说法。 | attention-seeker type（偏贬义） | 群主 bible Basics | pending |
| 鲨鱼人 | shark-boy | "鲨鱼人"在英文里 shark-man 会读成成年人，和全员小孩的设定冲突。 | shark-man（年龄错）；shark-kid（太口语） | 群主 bible ×2 | pending |
| 刻着"卒"的象棋子 | a chess piece carved with the pawn character | 英文页不能出现汉字。正文解释时补"in Chinese chess"，让"过河卒不能回头"在英文里成立。 | 写 "zu" 拼音（读者不认识） | 群主 bible ×2 | pending |
| 整条鲨鱼都是酸的 | the whole shark goes sour | "酸"在中文里就是嫉妒，英文 sour 也能表达不爽，梗基本保住。 | goes green with envy（换了颜色，和淡紫鲨鱼打架） | 群主 bible ×1 | pending |
| 再来一盘！ | "Again!" | 小孩输了要重来的口吻，一个词。 | "One more game!"（太完整） | 群主 bible ×2 | pending |
| ……第几遍了？ | "…Which time is this?" | 抄到一半忘了数。 | "How many is that?"（意思对，少了"遍"的抄写感） | 群主 bible ×1 | pending |

## 2026-10-13 — new character: Fortuno

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 小锦鲤型 | little-lucky-charm type | "锦鲤"在中文网络里指好运的化身，英文读者不认识这个用法。lucky charm 是英文里同功能的说法。 | little-koi type（字面，英文读不出"好运"） | Fortuno bible Basics | pending |
| 全园的锦鲤 | The kindergarten's lucky charm | 同上，额外设定标题。 | the kindergarten's koi（同上） | Fortuno bible ×1 | pending |
| 反正我运气好。 | "It's fine, I'm lucky." | 口头禅，"反正"的不在乎落在 It's fine 上。 | "I'm lucky anyway."（尾重，不像小孩随口说的） | Fortuno bible ×1 | pending |
| 一起嘛！ | "Come on, together!" | "嘛"是撒娇式催促，Come on 承担这个语气。 | "Let's do it together!"（太完整，丢了黏人感） | Fortuno bible ×1 | pending |
| 这三件 Whiskle 都讨厌 | Whiskle can't stand any of the three | 对应 Whiskle bible 讨厌列表里的被大声说话 / 被催 / 植物被踩，"它怎么还不长"就是催。英文 bible 讨厌列表用 hurried，这里不再重复解释。 | — | Fortuno bible、Whiskle bible | pending |
| 蒙的 / 蒙对的算不算 | he guessed / Whether a lucky guess counts | "蒙"是瞎猜，英文 lucky guess 同时点到他的运气。 | he got lucky（太直接，丢掉"猜"） | Fortuno、Whiskle bible | pending |
| 那页笔记只写了三个字："不可能。" | The page has one word on it: "Impossible." | 中文"三个字"指"不可能"的字数，英文一个词，数字跟着改。 | — | Fortuno bible ×1 | pending |
| 三叶草……等里面长出一棵四片叶的 | waiting for the clover pot … to put up one with four leaves | 四叶草是三叶草的变异，不是能直接种出来的品种，等它长出来本身就是"好东西要慢慢来"。 | grow a four-leaf clover（字面，植物学上不对） | Whiskle bible ×1 | pending |

## 2026-10-13 — new characters: Jiuyue and Ming

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 九月 | Jiuyue | 与 Ruanruan、Dianer 同一规则：名字就是名字，拼音保留。 | September（意译，丢失人名感，也和后面"九月 = 第九个月亮"的解释冲突） | 两份 bible、config | pending |
| 明 = 日 + 月 | Ming = a sun + a moon / "His name is written with two pieces: a sun and a moon." | 英文页不能出现汉字（`audit_en.py --dist` 会报），所以把拆字写成一句描述，让后面"两个人名字里都有月亮"的梗还能成立。 | 保留汉字加注（审计不通过）；直接删掉拆字（整个额外设定失去支点） | 明 bible ×2 | pending |
| 两个人的名字里都有一个"月" | Both their names have a moon in them. His is half moon; hers, Jiuyue, is September, written in Chinese as "the ninth moon". | 中文读者一眼看得出两个名字共享"月"字，英文读者看不出。补一个从句说明九月 = 第九个月亮，是这里唯一的加法，否则 Fufu 的"发现"没有内容。 | 不解释（笑点落空）；放到脚注（规则禁止脚注） | 明 bible ×1 | pending |
| 秋水青 / 白露银 / 朱 / 月白 | autumn-water teal / White Dew silver / vermilion / moon-white | 白露是节气，英文通用译名是 White Dew；秋水保留字面意象。 | sea teal、frost silver（丢掉《蒹葭》和节气的出处） | 两份 bible Basics | pending |
| 嗯。 | "Mm." | 九月的一个字回答。"Mm." 同样是一个音节、不表态。 | "Yeah."（太积极）；"Hm."（像在怀疑） | 九月 bible ×4，明 bible ×1 | pending |
| 嗑她和明 | ships her with Ming | 网络用语"嗑 CP"对应英文的 ship，同样是粉丝圈说法。 | is rooting for them（太温和，丢掉起哄感） | 两份 bible | pending |
| 报幕 / 主持人 | announce an act / MC | 幼儿园文艺活动语境，MC 比 host 更有"报幕"的舞台感。 | host（偏电视节目）；emcee（拼法生僻） | 明 bible | pending |
| 场面话 | a perfectly smooth answer that contained nothing at all | 中文"场面话"是固定说法，英文没有对应词，按功能写成一句。 | diplomatic non-answer（太书面） | 明 bible ×1 | pending |

## 2026-09-09 — four-witches ending sync

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 在自己原本画满笑脸太阳的纸上 | On the paper with its sun full of smiling faces | 故事开头明确是一轮太阳里有十二张笑脸；英文沿用这个已建立的画面，避免结尾突然变成很多个太阳。 | over the paper filled with smiling suns（更贴结尾字面，但与开头冲突）；on his original drawing（丢失笑脸太阳的画面） | four-witches.en.md ×1 | pending |
| 牧师画的《五个魔女和一只逃跑的狗》 | Mushi's drawing: Five Witches and a Fleeing Dog | “Fleeing”比逐字的“running away”更像画作标题，同时保留狗正在逃跑的动作。 | Five Witches and a Dog Running Away（准确但不像标题）；Five Witches and a Runaway Dog（容易理解成离家出走的狗） | four-witches.en.md ×1 | pending |

## 2026-09-09 — full site: 12 bibles, 6 stories

All rows below were approved by QC on 2026-09-09; reusable terms are in the glossary.

### Game and IDs

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 王者兰特 | Kings of Rant | 中文是《王者荣耀》的谐音戏仿。"Kings of" 保住"王者"和 MOBA 味，"Rant"和"兰特"同音，又是英文里"喷"的意思，正好是排位夜的气氛。 | Honor of Rants（更贴原梗但作为标题不顺口）；Kingslant（纯音译，没有笑点）；Rank of Kings（太像真游戏，失去戏仿感） | kings-rank-night.en.md，Dianer / Liiie 的 bible | approved |
| 狗不理 | NoDogsAllowed | 天津包子梗保不住。这个 ID 的功能是：像一个真实玩家 ID，让人猜不到是狗，揭晓时又觉得"原来早有暗示"。"NoDogsAllowed"三点都满足，而且第一名的 ID 叫"禁止狗入内"，本人是狗，反差最强。 | TopDog（太直白，揭晓前就露馅）；Goubuli（音译，英文读者什么都读不出）；Fetch（有狗味，但不像排行榜第一的 ID） | kings-rank-night.en.md ×4，Dianer / Liiie / Haide bible | approved |
| 点到为止 | PointTaken | 原 ID 取自点儿的名字，也是他"算好了就收手"的打法。"Point"对应"点"，"PointTaken"本义是"我明白了，到此为止"，正好是"点到为止"的意思，而且像一个真实 ID。 | JustEnough（意思对，丢了名字）；CleanStop（打法对，丢了名字）；Dianer（直接用名字，太露） | kings-rank-night.en.md，Dianer / Liiie bible | approved |
| 夜行玫瑰 | NightRose | 直译，只是并成一个词，符合游戏 ID 习惯。 | Night Rose（两个词，像笔名不像 ID） | kings-rank-night.en.md，Dianer / Liiie bible | approved |
| 定榜 | the rankings lock / ranking night | 中文"定榜"是造词，英文没有对应，用"lock"表达"定"。标题用 Ranking Night。 | settlement night（太像财务）；leaderboard day（丢了"夜"） | kings-rank-night.en.md | approved |
| 别看了，学不会的。 | Stop watching. You can't learn it. | 两个短句，保持 Haide 头也不回的冷淡。 | Don't bother, you'd never learn（多了一层劝，太软） | kings-rank-night.en.md，Dianer / Haide bible | approved |

### Titles and names

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 幼儿园四大魔女 | The Four Witches of the Kindergarten | 直译即可，"Four Witches"本身就有戏仿感。 | The Kindergarten's Four Witches（弱） | four-witches.en.md | approved |
| 贪婪 / 嫉妒 / 愤怒 / 懒惰魔女 | Witch of Greed / Envy / Wrath / Sloth | 四个词正好是七宗罪的英文，Haide 的"评级"因此更像一本正经的胡说。 | Greedy Witch 等形容词形式（没有七宗罪的联想） | four-witches.en.md | approved |
| QC 的连环噩梦 | QC's Nightmare in Three Acts | "连环"直译成 chain 很怪，正文本来就是三层梦，用"三幕"点题。 | QC's Chain Nightmare（生硬）；QC's Nightmare, Three Layers Deep（长） | qc-nightmare.en.md，QC bible | approved |
| 七天追咬事件 | The Seven-Day Bite | 去掉"事件"，英文标题不需要。 | The Seven-Day Chase（丢了"咬"）；The Seven-Day Bite Incident（累赘） | seven-day-bite.en.md | approved |
| 午夜的金色法拉利 | The Gold Ferrari at Midnight | 直译。 | Midnight Gold Ferrari（像车型名） | midnight-ferrari.en.md | approved |
| Haide 变成狗的那一天 | The Day Haide Became a Dog | 直译。 | | haide-became-a-dog.en.md | approved |
| 牧师 | Mushi | 沿用 config 里已定的英文名，正文里保留"clerical collar / prayer book"的神职意象。 | Pastor（当名字用太像职务） | 全站 | 已由 config 定 |
| 处理方案 001 / 014 | Case 001 / Case 014 | 艾莎的编号计划。"Case"短、冷、像档案，比"Handling Plan"像她。 | Handling Plan 001（直译，啰嗦）；Protocol 001（太机构化） | 多处 | approved |
| 红书 | the Red Book | 大写，当专名，它在故事里几乎是一个角色。 | the red notebook（太随便） | 多处 | approved |
| 董事长 | the Chairman | 大写当外号用；陆姚和艾莎口中的"董事长"都带讽刺，大写保住这个味道。 | the Director（不准确） | 多处 | approved |
| 阿姨（QC 的女伴） | Auntie | 保留孩子的叫法，加引号首次出现。 | the lady / companion（丢了小孩视角） | QC / Mushi bible | approved |
| 小手术 | a little operation, the kind dogs get | QC 的委婉语。英文同样委婉，让 Haide"听懂了"成立。 | getting him fixed（更地道但一说就懂，Haide 反应就不够戏剧）；neutering（直白，破坏笑点） | seven-day-bite.en.md，多个 bible | approved |
| 兔兔 | Bun-bun | 软软给兔子的昵称，需要叠字感。 | Bunny（普通）；Mr. Bunny（多了性别） | 软软 bible | approved |
| 呆毛 | cowlick | 英文没有"ahoge"这个通用词，cowlick 最接近。 | ahoge（动漫圈术语，一般读者不懂） | 多个 bible | approved |

### Lines and jokes

| 原文 | 译文 | 为什么 | 其他方案 | 出现位置 | 状态 |
|---|---|---|---|---|---|
| 匹夫无罪，怀璧其罪 | As they say: an innocent man, a guilty jade. | 原文是 Haide 掉书袋，牧师听不懂追问。英文保留一句听起来像古谚但英语读者也不懂的话，让"什么意思？"这一问成立。 | "Don't hate the player, hate the game"（读者懂了，牧师就不该问）；直接省略成语（丢了 Haide 装腔的笑点） | four-witches.en.md | approved |
| 我就问问价！ | I just want a quote! | Fufu 追着问"值多少钱"。"quote"在英文里既是报价也是引语，保住她一本正经的荒谬感。 | I just want to ask the price!（平） | four-witches.en.md | approved |
| 我 tm 撞死你！你 tm 才是狗！你下辈子当狗去吧！ | I'll f\*\*\*ing flatten you! YOU'RE the f\*\*\*ing dog! Come back as a dog next time! | 原文用"tm"缩写自我审查，英文用星号对应。"下辈子"改成"next time"更像卡车司机的吼法。 | 保留完整脏字（比原文更粗）；"in your next life"（准确但太文） | qc-nightmare.en.md | approved |
| 伪娘人设 | written so pretty that everyone takes him for a girl | 英文没有不冒犯的对应词，改用描述。 | "trap"（网络俚语，含贬义，弃）；"femboy"（同上） | qc-nightmare.en.md | approved |
| 我说过的。 | I told you. | Mimi 三个字，英文也要三个词。 | I said so.（弱）；Told you so.（太得意，Mimi 是平的） | haide-became-a-dog.en.md，Mimi bible | approved |
| 有我在。 | I've got you. | 比 "I'm here" 更像队长。 | I'm here.（牧师那句用了 "It's okay, I'm here."，两人区分开） | Mimi bible | approved |
| 这个嘛……不能白说哦。 | ~~Well… this doesn't come free.~~ | 已作废（2026-09-10）：QC 取消了牧师收费的人设，中英两侧的这句台词都已删除，改为「憋不住直接说」。 | — | 已从 牧师 bible 与 four-witches.en.md 移除 | retired |
| 别逼我骂你。 | Don't make me swear at you. | 直译即可。 | Don't push me.（丢了"骂"） | 陆姚 bible | approved |
| 靠 / 滚 / 你他妈 | "Damn", "get lost" and "you f—" | bible 明确列出脏话，英文降一档并截断，符合 skill"脏话暗示不拼写"的原则。 | 完整拼写（超出原文尺度） | 陆姚 bible | approved |
| 理论上可行，但需要极高的智商。 | Theoretically feasible. Requires an extremely high IQ. | 拆成两句，像点儿的笔记。 | 一句话版本（少了笔记感） | midnight-ferrari.en.md，点儿 / QC bible | approved |
| 处理方案 014：转交董事长。结果：失败。董事长不可靠。 | Case 014: escalated to the Chairman. Result: failed. Chairman unreliable. | 保持档案语气，末句无冠词像批注。 | | seven-day-bite.en.md，艾莎 bible | approved |
| 软软发呆时的眼神，不像在害怕，像在加速。 | When Ruanruan stares into space, she doesn't look scared. She looks like she's accelerating. | 两句，最后一个词落在 accelerating。 | | 艾莎 / 软软 bible | approved |
| 变回去还得穿裤子。 | （事件档案，未翻译） | 事件档案章节不在网页渲染，本次未翻。 | | Haide / 点儿 / Liiie / QC bible 的 Archive 章节 | 未翻 |
| peace and love | keep the peace and love | 原文就是英文，保留。 | | Mimi bible | approved |
| 陆姚刺猹 / 猹 | Luyao and the Zha / zha | 猹是鲁迅自造的字，谁也说不清是什么动物，英文音译保留这份含糊；标题不用"stabs"，把动作留给正文。 | Luyao Stabs the Zha（直译，剧透动作）；badger（把含糊说死了） | luyao-stabs-zha.en.md | pending |

### Deliberately not translated

- `## 事件档案（已迁移）` sections in Haide, Dianer, Liiie and QC bibles: not rendered by the site, and their content already lives in the stories. Translate on request.
