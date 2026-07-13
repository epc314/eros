# Eros

Eros 是一个公共的数字实体演化世界。每个节点都是不可变的 512-bit Hash；Hash 同时是数字基因组、遗传标识、实体 Token 的编码来源和图片描述的唯一来源。任意两个既有节点加上一个新名称，就能确定性地产生一个新节点。

在线体验：[eros-genome-world.cassette2024.chatgpt.site](https://eros-genome-world.cassette2024.chatgpt.site)

首页是完整的可交互有向无环图。它支持缩放、平移、按 generation 固定分行、名称/Hash 搜索、代数与创世节点过滤、祖先/后代聚焦、节点详情、图中亲本选择、繁衍与新增创世根节点。每个演化节点恰有两条标为“亲本”的入边。

当前默认使用 Black Forest Labs 官方 `FLUX.2 [klein] 9B Preview` API。请求不提交 width 或 height，生成完成后立即从短期签名地址下载 PNG，读取并保存文件自身的原始宽高；界面保持图片比例完整展示，不执行二次缩放或裁切。图谱同时展示图片、主体、辅助实体与 Hash；详情保留完整 Token、突变过程、确定性 Prompt 和多次视觉解释历史。图片失败不会影响节点创建。本机 `FLUX.2 [klein] 4B` Provider 继续作为离线备选。

## 创世世界

世界初始化时固定创建七个 generation 0 节点：`Gaia`、`Eros`、`Psyche`、`Tartarus`、`Erebos`、`Khaos`、`Uranus`。初始化后也可以从首页“创世”页签新增没有亲本的 generation 0 根节点；新增节点不会替换或改写这七个初始节点。

第一次初始化时，世界只保存一次统一的 UTC Unix 毫秒时间戳。若配置 `EROS_WORLD_GENESIS_TIMESTAMP_MS` 就采用该值，否则只在第一次事务中读取当前时间。后续启动与重复初始化永不覆盖它，因此同一个数据库中的创世身份不会随重启漂移。

每个创世 genome 只由名称和这个时间戳决定（域标签与协议版本用于隔离）：

```text
HASH512("EROS_GENESIS", protocolVersion, normalizedName, uint64(worldGenesisTimestampMs))
```

初始化是事务化、幂等的：

```bash
npm run db:seed
```

也可以调用 `POST /api/world/initialize`，并通过 `x-eros-setup-token` 或 Bearer Token 提交 `EROS_SETUP_TOKEN`。已初始化时返回原世界和 `created: false`。

## 确定性遗传协议

Eros 没有性别角色。两个亲本按完整 genome 小写 Hex 的字典序规范化为 `parentLow` 与 `parentHigh`（相同 genome 时以节点 ID 破同序），因此交换界面中的 A/B 不影响任何结果。

512-bit genome 被精确拆成两条 256-bit 染色体，再按主体实体所在的前 32 bit 分为 `C0: c00 | c01` 与 `C1: c10 | c11`。`eros-v3` 使用 SHAKE-256 结果的最后三位确定重组：最后一位在两种互补的 C0/C1 亲本配对间选择；另外两位分别表示保持原状、交换 `c11′/c01`、交换 `c11′/c11` 或交换 `c01/c01′`。因此共有八种确定性组合，同时 `c00` 主体段始终来自被选中的 C0 亲本并保持在原位置。未选染色体仍参与突变排名种子。

亲本完整 genome 的 XOR 得到 Hamming 距离；`512 - distance` 是相同 bit 数。只有亲本原本相同的位置才有资格翻转。亲缘不稳定度使用纯 `BigInt` 的六次幂整数曲线：

```text
extra = floor(30 × sameBitCount⁶ ÷ 512⁶)
budget = min(sameBitCount, 2 + extra)
```

所以普通无关 Hash 保持很低的翻转量，更相似的节点单调地获得更多翻转。具体位置不是随机抽取：每个候选 bit 通过带域标签的 SHAKE-256 排名；排名种子包括规范化亲本、子代名称和两条未选染色体。按排名字节升序选择预算内的位置，再对基础 genome XOR；主体所在的 `c00` 段不参与 bit 翻转。算法不读取时间、不使用随机数，也不依赖请求顺序，所以相同输入总是得到相同 Hash、Token 与 Prompt。

这里的“亲缘相似度导致更多 bit 翻转”是艺术化数字演化机制。现实生物学中的近亲繁殖主要提高基因纯合度，并增加有害隐性性状表达的机会，不等同于直接提高新突变率。Eros 不是现实遗传学模型。

## Token、图片与记述

512 bit 以大端顺序解码为 32 个 16-bit Token，不做取模。v8 为每个实体槽使用一组相邻 Token：主体使用 0+1，三个辅助分别使用 8+9、16+17、24+25。主体用 Token 0 与 Token 1 的最高 nibble 组成真正的 8-bit 编号，直接索引 256 个明确实体：编号 0–63 是现实自然生物，64–127 是不含天体、山川地貌及普通人造物的自然非生物，128–255 是幻想种族、神兽、元素生命和幻想机械生命。Token 1 剩余 12 bit 继续编码气质、尺度和装束。辅助实体保持 16 种基础元素与 16 种显现方式组合，共 256 种类型。仅计算一主三辅的有序类型组合就有 4,294,967,296 种。每组双 Token 位于同一条染色体内，繁衍时一起继承。

其余 24 个 Token 继续描述内在特征，由 16 个特征类别、16 个审美强度与每类 16 个描述词组成。v5 起词表移除了多孔、颗粒、凹坑、穿孔、细胞、密集簇集等容易引发不适的形态语言，256 个英文描述词全局不重复。第四个 nibble 通过可逆轮换选择描述 B；发生同项编码时使用“和声呼应的对应形态”，从而保留全部 65,536 种唯一表达且不显示 A/B 重复。界面同时显示严格对应的中文与英文短语。

固定模板始终完整使用四组双 Token 实体，并统一加入精简的古希腊史诗神话风格：庄严、永恒的古典美学、神话宏伟感、电影化构图、高细节幻想概念艺术与史诗历史基调。24 个内在特征进入 Prompt 前按 Token 位置从小到大进行 family 键级去重：`contour`、`repetition`、`optical-response` 等键重复时，只保留该键位置最早的整条 Token；实体组不参与去重。该处理只影响 Prompt 表达，不改变 Hash、Token 或遗传记录，也不经过语言模型改写。节点名称、亲本、时间、相似度和记述都不会进入 Prompt。Prompt 仅由服务端提交给选定的图片 Provider。`mock` Provider 仍用于无需模型的开发和 E2E；通用 `real` HTTP Provider 也保留。

任何访问者都能追加 1–500 个 Unicode 字符的纯文本记述（可选 64 字符署名）。记述是追加式公共文本，有基础限流和重复检测；它不会影响 Hash、Token、Prompt 或图片输入。普通 API 不提供名称、遗传数据或记述的修改/删除操作。

## 本地运行

要求 Node.js 20+。

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run flux:setup
npm run db:seed
npm run dev:full
```

打开 [http://localhost:3000](http://localhost:3000)。生产运行：

```bash
npm run build
npm start
```

环境变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | Prisma SQLite URL，默认 `file:./dev.db` |
| `IMAGE_PROVIDER` | `bfl`（默认）、`flux-local`、`mock` 或 `real` |
| `BFL_API_KEY` | Black Forest Labs 服务端 API Key；仅保存在服务端环境中 |
| `FLUX2_LOCAL_URL` | 离线 4B Provider 地址，默认 `http://127.0.0.1:7861` |
| `IMAGE_API_KEY` | 真实 Provider 的服务端密钥 |
| `IMAGE_API_URL` | 真实图片服务的 POST Endpoint |
| `IMAGE_MODEL` | 可选真实 Provider 模型名 |
| `EROS_WORLD_GENESIS_TIMESTAMP_MS` | 可选的可复现创世毫秒时间戳，只在首次初始化采用 |
| `EROS_SETUP_TOKEN` | 初始化 API 的保护密钥 |
| `EROS_BACKUP_TOKEN` | 托管数据库只读导出接口的保护密钥 |
| `EROS_BACKUP_URL` | 可选的托管备份接口地址 |
| `EROS_BACKUP_PATH` | 可选的本地备份文件路径 |

## 数据库备份

托管版本提供受 `EROS_BACKUP_TOKEN` 保护的只读导出接口。本地执行：

```bash
npm run backup:hosted
```

默认写入 `~/Documents/Eros Backups/eros-database-latest.json`。脚本先写临时文件，再原子替换同名备份，因此始终只保留最新的一份；请求或校验失败时不会破坏已有备份。导出包含世界、存在、繁衍、亲缘边、记述、反馈和图片数据库记录，不包含图片文件本身。请勿提交 `.env` 或备份 JSON。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium   # 首次运行 E2E 前
npm run test:e2e
npm run build
```

单元测试覆盖创世、前导零、亲本交换不变性、相似度、突变预算单调性、合法翻转位置、XOR 可逆性、Token/词表、Prompt、代际布局、图遍历和初始化幂等性。Playwright 使用 Mock Provider 覆盖创世与后代创建、图片展示、第二次视觉解释、Hash/Token/Prompt 详情和记述流程。

## API

- `POST /api/world/initialize`
- `GET /api/graph`
- `POST /api/nodes/genesis`（只接受 `name`）
- `POST /api/reproduce`（只接受 `parentAId`、`parentBId`、`name`）
- `POST /api/reproduce/preview`
- `GET /api/nodes?query=&generation=&type=&page=`
- `GET /api/nodes/[id]`
- `POST /api/nodes/[id]/descriptions`
- `POST /api/nodes/[id]/images`（不接受自由 Prompt）
- `GET /api/world/backup`（需要 `EROS_BACKUP_TOKEN`）

所有错误使用 `{ "error": { "code", "message", "details"? } }`。节点名称经过 NFKC、trim 和小写 name key 约束世界内唯一；名称、Hash、亲本关系、创建时间与遗传记录创建后不可修改。

## 协议版本策略

当前遗传协议是 `eros-v3`，图片模板是 `eros-entity-prompt-v8`。v8 将 256 项明确主体表严格分为 64 个现实自然生物、64 个自然非生物和 128 个幻想种族；v7 首次使用 8-bit 明确主体索引；v6 引入四组双 Token 实体编码；v5 使用审美安全、全局不重复的内在特征词表；v4 及更早节点继续使用冻结的旧解释，避免历史语义漂移。`eros-v1` 历史节点保持不可变；v2 修正了染色体换位导致主体槽语义漂移的问题；v3 在保护 32-bit 主体段的前提下加入八种确定性分段重组。Hash 域标签、输入序列化、亲本规范化、染色体选择、曲线或突变排名的任何语义变化都必须发布新的协议版本，不能原地改变既有节点的解释。数据库在每个 World、Node 和图片记录中保存对应版本，以便未来版本共存和审计。
