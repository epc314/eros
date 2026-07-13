# Eros

Eros 是一个基于 512-bit Hash 遗传、确定性突变、实体生成与关系图谱的数字演化世界。每个存在都拥有不可变的 Hash；任意两个存活的存在加上一个新名称，可以确定性地产生新的后代。

在线体验：[eros-genome-world.cassette2024.chatgpt.site](https://eros-genome-world.cassette2024.chatgpt.site)

## 主要功能

- 创建创世存在，或选择两个既有存在进行繁衍
- 相同亲本和名称始终产生相同结果
- 按代际排列的可交互关系图谱
- 支持名称与 Hash 前缀搜索、祖先与后代聚焦
- 支持存在的死亡与复活状态
- 浮士德叙事助手可结合世界图谱和选中的存在持续对话，并可手动重置会话
- 响应式界面，兼容桌面与手机浏览器

## 核心规则

两个亲本会先按完整 Hash 规范化排序，因此交换界面中的选择顺序不会改变结果。遗传过程从八种染色体分段组合中确定一种，并保护决定主体的片段不发生换位或突变。

亲本越相似，后代获得的 bit 翻转预算越高。所有组合和翻转位置都由 Hash 确定，不读取时间、不使用随机数，也不依赖请求顺序。

这是一套用于数字艺术与世界叙事的演化机制，不是现实遗传学模型。

## 本地运行

要求 Node.js 20+。

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

生产运行：

```bash
npm run build
npm start
```

环境变量示例见 [`.env.example`](./.env.example)。密钥只应保存在本地 `.env` 或托管平台的私密环境变量中。

## 数据库备份

配置 `EROS_BACKUP_TOKEN` 后运行：

```bash
npm run backup:hosted
```

默认备份到 `~/Documents/Eros Backups/eros-database-latest.json`。脚本会原子覆盖同名文件，只保留最新备份；导出失败时不会破坏已有文件。

## LLM 上下文接口

`GET /api/world/context` 返回精简的文字图谱数据和全部记述、票数及争议标记；添加 `?format=text` 可获得适合直接放入模型上下文的行式文本，可选 `lang=zh|en|both`。`GET /api/existences/{名称或ID}` 返回单个存在的全部详细信息。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
