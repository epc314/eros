/** Vocabulary frozen for nodes created with image prompt versions through v4. */
export const LEGACY_DESCRIPTOR_INTENSITIES = [
  "barely", "subtly", "lightly", "loosely", "partially", "moderately", "noticeably", "clearly",
  "strongly", "highly", "densely", "broadly", "locally", "variably", "irregularly", "extremely",
] as const;

export const LEGACY_DESCRIPTOR_INTENSITIES_ZH = [
  "几乎不可见地", "微妙地", "轻微地", "松散地", "部分地", "适度地", "显著地", "清晰地",
  "强烈地", "高度地", "密集地", "广泛地", "局部地", "变化地", "不规则地", "极度地",
] as const;

export const LEGACY_DESCRIPTOR_TERMS: readonly (readonly string[])[] = [
  ["rounded", "angular", "elongated", "compressed", "faceted", "folded", "tapered", "radial", "axial", "branching", "hollow", "solid", "layered", "twisted", "clustered", "distributed"],
  ["smooth", "jagged", "serrated", "undulating", "stepped", "broken", "continuous", "notched", "scalloped", "sharp", "soft-edged", "irregular", "enclosed", "open", "fractured", "interrupted"],
  ["balanced", "uneven", "narrow", "broad", "elongated", "compact", "expanded", "compressed", "centered", "offset", "top-weighted", "base-weighted", "uniform", "variable", "tapered", "distributed"],
  ["connected", "disconnected", "nested", "branching", "looped", "interlocked", "fused", "modular", "perforated", "clustered", "isolated", "ringed", "webbed", "recursive", "layered", "networked"],
  ["bilateral", "radial", "rotational", "mirrored", "approximate", "broken", "offset", "alternating", "partial", "local", "global", "multi-axis", "skewed", "asymmetric", "repeated", "irregular"],
  ["unified", "segmented", "partitioned", "banded", "sectioned", "modular", "jointed", "layered", "stacked", "nested", "interrupted", "continuous", "repeated", "alternating", "fused", "separated"],
  ["periodic", "irregular", "alternating", "recursive", "echoed", "clustered", "scattered", "ordered", "progressive", "decreasing", "increasing", "nested", "mirrored", "offset", "sparse", "dense"],
  ["flat", "arched", "concave", "convex", "spiraled", "coiled", "twisted", "bent", "waved", "folded", "sinuous", "angular", "rounded", "tapered", "flared", "reversed"],
  ["defined", "diffuse", "sharp", "soft", "layered", "porous", "interrupted", "continuous", "fringed", "banded", "outlined", "embedded", "overlapping", "recessed", "projecting", "ambiguous"],
  ["smooth", "rough", "granular", "fibrous", "porous", "polished", "matte", "ridged", "grooved", "layered", "crystalline", "wrinkled", "fractured", "woven", "pitted", "uniform"],
  ["solid", "hollow", "layered", "cellular", "lattice-like", "chambered", "fibrous", "granular", "networked", "radial", "stacked", "nested", "continuous", "fragmented", "dense", "open"],
  ["sparse", "dense", "compact", "porous", "open", "packed", "distributed", "clustered", "uniform", "variable", "concentrated", "diffuse", "layered", "hollow", "solid", "gradient-like"],
  ["matte", "reflective", "translucent", "opaque", "transparent", "luminous", "absorptive", "iridescent", "glossy", "diffuse", "refractive", "shimmering", "muted", "radiant", "shadowed", "neutral"],
  ["monochromatic", "contrasting", "gradient", "banded", "speckled", "layered", "muted", "saturated", "pale", "dark", "warm-shifted", "cool-shifted", "complementary", "adjacent", "iridescent", "variable"],
  ["continuous", "discontinuous", "gradual", "abrupt", "alternating", "interrupted", "blended", "separated", "progressive", "repeated", "localized", "distributed", "stable", "variable", "transitional", "fragmented"],
  ["minimal", "simple", "moderate", "intricate", "recursive", "layered", "dense", "sparse", "ordered", "irregular", "fine", "coarse", "localized", "distributed", "repeated", "emergent"],
] as const;

export const LEGACY_DESCRIPTOR_TERMS_ZH: readonly (readonly string[])[] = [
  ["圆润", "棱角分明", "细长", "压缩", "多面", "折叠", "渐尖", "放射状", "轴向", "分枝", "中空", "实心", "分层", "扭曲", "簇集", "分散"],
  ["平滑", "锯齿状", "细锯齿", "起伏", "阶梯状", "断裂", "连续", "带缺口", "扇贝状", "锐利", "柔边", "不规则", "封闭", "开放", "破碎", "间断"],
  ["均衡", "不均", "狭窄", "宽阔", "细长", "紧凑", "扩展", "压缩", "居中", "偏移", "上部偏重", "底部偏重", "均一", "多变", "渐尖", "分散"],
  ["连通", "断开", "嵌套", "分枝", "环状", "互锁", "融合", "模块化", "穿孔", "簇集", "孤立", "环绕", "网状", "递归", "分层", "网络化"],
  ["双侧", "放射", "旋转", "镜像", "近似", "破缺", "偏移", "交替", "局部", "区域性", "全局", "多轴", "倾斜", "非对称", "重复", "不规则"],
  ["统一", "分节", "分区", "带状", "分段", "模块化", "关节化", "分层", "堆叠", "嵌套", "间断", "连续", "重复", "交替", "融合", "分离"],
  ["周期性", "不规则", "交替", "递归", "回响式", "簇集", "散布", "有序", "渐进", "递减", "递增", "嵌套", "镜像", "偏移", "稀疏", "密集"],
  ["平坦", "拱形", "凹陷", "凸起", "螺旋", "盘绕", "扭曲", "弯折", "波状", "折叠", "蜿蜒", "折角", "圆曲", "渐尖", "外扩", "反向"],
  ["明确", "弥散", "锐利", "柔和", "分层", "多孔", "间断", "连续", "流苏状", "带状", "描边", "嵌入", "重叠", "凹入", "凸出", "模糊"],
  ["平滑", "粗糙", "颗粒状", "纤维状", "多孔", "抛光", "哑光", "脊状", "沟槽状", "分层", "晶体状", "褶皱", "破裂", "编织状", "凹坑状", "均一"],
  ["实心", "中空", "分层", "细胞状", "晶格状", "分室", "纤维状", "颗粒状", "网络化", "放射状", "堆叠", "嵌套", "连续", "碎片化", "致密", "开放"],
  ["稀疏", "致密", "紧凑", "多孔", "开放", "紧密堆积", "分散", "簇集", "均一", "多变", "集中", "弥散", "分层", "中空", "实心", "渐变式"],
  ["哑光", "反射", "半透明", "不透明", "透明", "发光", "吸光", "虹彩", "光泽", "漫反射", "折射", "闪烁", "低调", "明亮", "阴影化", "中性"],
  ["单色", "对比", "渐变", "带状", "斑点状", "分层", "低饱和", "高饱和", "浅淡", "深暗", "偏暖", "偏冷", "互补", "邻近", "虹彩", "多变"],
  ["连续", "不连续", "渐进", "突变", "交替", "间断", "混合", "分离", "渐进发展", "重复", "局部化", "分散", "稳定", "多变", "过渡", "碎片化"],
  ["极简", "简单", "适中", "繁复", "递归", "分层", "密集", "稀疏", "有序", "不规则", "精细", "粗略", "局部化", "分散", "重复", "涌现"],
] as const;
