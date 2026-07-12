import { BASE_MUTATION_BITS, GENESIS_NODE_NAMES, KINSHIP_EXPONENT, MAX_KINSHIP_EXTRA_BITS, PROTOCOL_VERSION } from "@/lib/protocol/constants";

export default function ProtocolPage() {
  return <main className="mx-auto max-w-4xl px-4 pb-16 pt-20 sm:px-5 sm:pb-20 sm:pt-28">
    <p className="text-xs uppercase tracking-[.24em] text-cyan-300 sm:tracking-[.28em]">Eros protocol / {PROTOCOL_VERSION}</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">一个确定性的数字演化世界</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">每个存在都是不可变的 512-bit Hash。任意两个既有存在与一个新名称，会在不读取时间、不使用随机数的条件下产生唯一后代。</p>
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {[{ title: "创世根存在", body: `初始化固定创建 ${GENESIS_NODE_NAMES.join(" · ")}；之后可继续新增使用同一世界创世时间戳的 Generation 0 根存在。` }, { title: "无序亲本", body: "亲本按完整 genome 排序。交换界面中的 A 与 B，不改变染色体配对、突变位置或子代。" }, { title: "染色体顺序保持", body: "eros-v2 只在 low C0 + high C1 与 high C0 + low C1 两种配对间选择。C0 永远留在 C0，C1 永远留在 C1，且两个亲本各贡献一条。" }, { title: "亲缘不稳定度", body: `${BASE_MUTATION_BITS} 个基础翻转，加最多 ${MAX_KINSHIP_EXTRA_BITS} 个亲缘翻转；相同 bit 数通过 ${KINSHIP_EXPONENT} 次幂整数曲线映射。` }, { title: "双 Token 实体", body: "主体使用 Token 0+1 的两个最高 nibble组成 8-bit 编号：0–63 为现实自然生物、64–127 为自然非生物、128–255 为幻想种族。三个辅助使用 8+9、16+17、24+25，分别组合为 256 种辅助类型；剩余 24 个 Token 描述内在特征。" }, { title: "Prompt 特征键去重", body: "四组实体始终完整保留。24 个内在特征按 Token 序号从小到大扫描；contour、repetition 等 family 键重复时，只保留该键最早出现的整条 Token。去重只影响 Prompt，不改变 Hash 或 Token。" }, { title: "记述", body: "任何访问者都能追加纯文本记述。记述不进入遗传算法、Token 解码或图片 Prompt。" }].map((item) => <section key={item.title} className="glass rounded-2xl p-5"><h2 className="font-semibold">{item.title}</h2><p className="mt-2 leading-7 text-slate-400">{item.body}</p></section>)}
    </div>
    <section className="mt-10 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6"><h2 className="text-lg font-semibold text-amber-200">科学说明</h2><p className="mt-3 leading-7 text-slate-300">Eros 的“亲缘相似度导致更多 bit 翻转”是一种艺术化数字演化机制。现实生物学中的近亲繁殖主要提高基因纯合度，并增加有害隐性性状表达的机会，不等同于直接提高新突变率。</p></section>
  </main>;
}
