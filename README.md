# Eros

<p align="center">
  <a href="#english">English</a> · <a href="#中文">中文</a>
</p>

<a id="english"></a>

## English

Eros is a digital evolution world built around 512-bit hash inheritance, deterministic mutation, entity creation, and an interactive genealogy graph. Every existence has an immutable identity, and living existences can produce descendants through reproducible inheritance rules.

**Live site:** [eros-genome-world.cassette2024.chatgpt.site](https://eros-genome-world.cassette2024.chatgpt.site)

### Highlights

- Create genesis existences or breed descendants from two living existences
- Explore an interactive radial genealogy with generation and relationship filters
- Search existences by name or Hash prefix and focus on ancestors or descendants
- Record the death and revival of existences
- Register narrator accounts and participate in the Proposal Stone community board
- Talk with Faust, the epic narrator, using selected world context
- Invoke Mephisto to discover treasures and browse the shared treasure collection
- Use the responsive interface on desktop and mobile browsers

### Core idea

Inheritance is deterministic: the same valid inputs always produce the same result. Parent chromosomes are combined through protected segment rules, while similarity influences the descendant's mutation budget. The system is designed for digital art, collaborative mythology, and worldbuilding—not as a model of real-world genetics.

### Run locally

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To use the local FLUX provider:

```bash
npm run flux:setup
npm run dev:full
```

Production build:

```bash
npm run build
npm start
```

See [`.env.example`](./.env.example) for configuration. Keep secrets in a local `.env` file or in private variables provided by the hosting platform.

### Database backup

After configuring `EROS_BACKUP_TOKEN`, run:

```bash
npm run backup:hosted
```

The latest database backup is written atomically to `~/Documents/Eros Backups/eros-database-latest.json`. A failed export does not replace the previous valid backup.

### LLM context APIs

- `GET /api/world/context` returns a compact textual summary of the world graph. Add `?format=text` for an LLM-friendly text response and optionally use `lang=zh|en|both`.
- `GET /api/existences/{name-or-id}` returns the complete information for one existence.

### Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

<p align="right"><a href="#中文">切换到中文 →</a></p>

---

<a id="中文"></a>

## 中文

Eros 是一个基于 512-bit Hash 遗传、确定性突变、实体生成与交互式谱系图谱的数字演化世界。每个存在都拥有不可变的身份，存活的存在可以按照可复现的遗传规则繁衍后代。

**在线体验：** [eros-genome-world.cassette2024.chatgpt.site](https://eros-genome-world.cassette2024.chatgpt.site)

### 主要功能

- 创建创世存在，或选择两个存活的存在繁衍后代
- 浏览支持代际与关系筛选的径向交互谱系
- 按名称或 Hash 前缀搜索，并聚焦祖先或后代
- 记录存在的死亡与复活
- 注册记述者账户，并参与建言石社区讨论
- 与史诗讲述者浮士德对话，并按需加入世界信息
- 借助梅菲斯特搜罗宝物，浏览共享的宝物图鉴
- 响应式界面，兼容桌面和手机浏览器

### 核心理念

遗传过程是确定性的：相同的有效输入始终产生相同结果。亲本染色体按照受保护的分段规则进行组合，相似度则影响后代的突变预算。这是一套服务于数字艺术、协作神话与世界叙事的机制，并非现实遗传学模型。

### 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

如需使用本机 FLUX Provider：

```bash
npm run flux:setup
npm run dev:full
```

生产构建：

```bash
npm run build
npm start
```

配置项参见 [`.env.example`](./.env.example)。密钥只应保存在本地 `.env` 或托管平台提供的私密环境变量中。

### 数据库备份

配置 `EROS_BACKUP_TOKEN` 后运行：

```bash
npm run backup:hosted
```

最新数据库备份会原子写入 `~/Documents/Eros Backups/eros-database-latest.json`。导出失败时不会覆盖上一份有效备份。

### LLM 上下文接口

- `GET /api/world/context` 返回精简的文字图谱摘要；添加 `?format=text` 可获得适合 LLM 读取的文本，并可使用 `lang=zh|en|both`。
- `GET /api/existences/{名称或ID}` 返回单个存在的完整信息。

### 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

<p align="right"><a href="#english">← Switch to English</a></p>
