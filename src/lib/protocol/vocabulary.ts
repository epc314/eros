export const PRIMARY_ENTITIES = [
  "stone", "tree", "human", "flying insect", "dragon", "beast", "bird", "fish",
  "fungus", "flower", "crystal", "slime", "serpent", "shell organism", "construct", "unknown lifeform",
] as const;

export const PRIMARY_ENTITIES_ZH = [
  "石头", "树木", "人类", "飞虫", "龙", "野兽", "鸟类", "鱼类",
  "菌类", "花卉", "水晶", "黏液体", "蛇形生物", "甲壳生物", "构造体", "未知生命体",
] as const;

/** v8 explicit 8-bit primary entity table: 64 living, 64 natural nonliving, 128 fantasy. */
export const PRIMARY_SPECIES = [
  // 0–63 · living organisms found in nature
  "human", "dog", "wolf", "fox", "cat", "lion", "tiger", "leopard",
  "bear", "giant panda", "elephant", "rhinoceros", "horse", "deer", "giraffe", "rabbit",
  "squirrel", "otter", "monkey", "gorilla", "kangaroo", "bat", "dolphin", "whale",
  "eagle", "owl", "crow", "sparrow", "parrot", "peacock", "swan", "duck",
  "penguin", "crane", "hummingbird", "shark", "salmon", "carp", "eel", "seahorse",
  "octopus", "jellyfish", "crab", "shrimp", "turtle", "crocodile", "lizard", "snake",
  "frog", "butterfly", "bee", "beetle", "dragonfly", "spider", "scorpion", "earthworm",
  "oak tree", "pine tree", "bamboo", "cactus", "fern", "rose", "lotus", "mushroom",
  // 64–127 · bounded natural nonliving entities; no celestial bodies or landforms
  "stone", "pebble", "sand", "clay", "soil", "mud", "crystal", "geode",
  "quartz", "amethyst", "ruby", "sapphire", "emerald", "diamond", "opal", "jade",
  "obsidian", "granite", "marble", "slate", "limestone", "basalt", "pumice", "amber",
  "gold", "silver", "copper", "iron", "tin", "zinc", "sulfur", "salt",
  "coal", "graphite", "mica", "magnetite", "pyrite", "hematite", "fluorite", "pearl",
  "water droplet", "ice crystal", "snowflake", "frost", "raindrop", "dewdrop", "hailstone", "icicle",
  "flame", "ember", "smoke", "ash", "electric spark", "fossil", "seashell", "coral skeleton",
  "feather", "antler", "bone", "driftwood", "fallen leaf", "pine cone", "eggshell", "petrified wood",
  // 128–255 · recognizable fantasy races, creatures, spirits, and imagined machines
  "werewolf", "treant", "lamia", "siren", "centaur", "minotaur", "elf", "dwarf",
  "fairy", "goblin", "orc", "troll", "giant", "cyclops", "ogre", "vampire",
  "zombie", "skeleton warrior", "mummy", "witch", "wizard", "valkyrie", "amazon", "nymph",
  "dryad", "satyr", "harpy", "gorgon", "mermaid", "merman", "angel", "demon",
  "dragon", "wyvern", "phoenix", "griffin", "unicorn", "pegasus", "chimera", "hydra",
  "sphinx", "basilisk", "cockatrice", "manticore", "cerberus", "kraken", "leviathan", "roc",
  "qilin", "nine-tailed fox", "pixiu", "xiezhi", "baku", "tengu", "kappa", "oni",
  "yeti", "sasquatch", "jackalope", "thunderbird", "moon rabbit", "rainbow serpent", "sea serpent", "world turtle",
  "fire elemental", "water elemental", "air elemental", "earth elemental", "ice elemental", "lightning elemental", "light elemental", "shadow elemental",
  "forest spirit", "tree spirit", "flower spirit", "mushroom sprite", "crystal spirit", "storm spirit", "mist spirit", "animal spirit",
  "ghost", "wraith", "banshee", "poltergeist", "will-o'-the-wisp", "shapeshifter", "doppelganger", "genie",
  "slime creature", "mimic", "living armor", "living statue", "golem", "gargoyle", "living scarecrow", "sandman",
  "automaton", "clockwork robot", "steam robot", "crystal robot", "wooden robot", "stone robot", "bronze robot", "iron robot",
  "mechanical beast", "mechanical bird", "mechanical dragon", "mechanical insect", "clockwork knight", "arcane machine", "rune guardian", "porcelain being",
  "paper golem", "clay golem", "ice golem", "lava golem", "vine golem", "bone golem", "glass golem", "shadow golem",
  "dream eater", "nightmare beast", "lightborn", "shadowborn", "void creature", "time wanderer", "dream guardian", "chaos spawn",
] as const;

export const PRIMARY_SPECIES_ZH = [
  "人类", "犬", "狼", "狐狸", "猫", "狮子", "老虎", "豹",
  "熊", "大熊猫", "大象", "犀牛", "马", "鹿", "长颈鹿", "兔子",
  "松鼠", "水獭", "猴子", "大猩猩", "袋鼠", "蝙蝠", "海豚", "鲸",
  "鹰", "猫头鹰", "乌鸦", "麻雀", "鹦鹉", "孔雀", "天鹅", "鸭",
  "企鹅", "鹤", "蜂鸟", "鲨鱼", "鲑鱼", "鲤鱼", "鳗鱼", "海马",
  "章鱼", "水母", "螃蟹", "虾", "龟", "鳄鱼", "蜥蜴", "蛇",
  "青蛙", "蝴蝶", "蜜蜂", "甲虫", "蜻蜓", "蜘蛛", "蝎子", "蚯蚓",
  "橡树", "松树", "竹子", "仙人掌", "蕨类", "玫瑰", "莲花", "蘑菇",
  "石头", "卵石", "沙粒", "黏土", "土壤", "泥", "水晶", "晶洞",
  "石英", "紫水晶", "红宝石", "蓝宝石", "祖母绿", "钻石", "蛋白石", "玉石",
  "黑曜石", "花岗岩", "大理石", "板岩", "石灰岩", "玄武岩", "浮石", "琥珀",
  "黄金", "白银", "铜", "铁", "锡", "锌", "硫磺", "盐晶",
  "煤", "石墨", "云母", "磁铁矿", "黄铁矿", "赤铁矿", "萤石", "珍珠",
  "水滴", "冰晶", "雪花", "霜", "雨滴", "露珠", "冰雹", "冰柱",
  "火焰", "余烬", "烟", "灰烬", "电火花", "化石", "贝壳", "珊瑚骨骼",
  "羽毛", "鹿角", "骨骼", "浮木", "落叶", "松果", "蛋壳", "硅化木",
  "狼人", "树人", "蛇妖", "塞壬", "半人马", "牛头人", "精灵", "矮人",
  "仙子", "哥布林", "兽人", "巨魔", "巨人", "独眼巨人", "食人魔", "吸血鬼",
  "僵尸", "骷髅战士", "木乃伊", "女巫", "法师", "女武神", "亚马逊战士", "宁芙",
  "树精", "萨堤尔", "鹰身女妖", "戈耳工", "美人鱼", "雄性人鱼", "天使", "恶魔",
  "龙", "双足飞龙", "凤凰", "狮鹫", "独角兽", "天马", "奇美拉", "九头蛇",
  "斯芬克斯", "巴西利斯克", "鸡蛇兽", "蝎尾狮", "地狱三头犬", "克拉肯", "利维坦", "大鹏巨鸟",
  "麒麟", "九尾狐", "貔貅", "獬豸", "食梦貘", "天狗", "河童", "鬼族",
  "雪人", "大脚怪", "鹿角兔", "雷鸟", "月兔", "彩虹蛇", "海蛇", "世界龟",
  "火元素", "水元素", "风元素", "土元素", "冰元素", "雷元素", "光元素", "影元素",
  "森林精魂", "树木精魂", "花卉精魂", "蘑菇仙", "水晶精魂", "风暴精魂", "迷雾精魂", "动物精魂",
  "幽灵", "怨灵", "报丧女妖", "骚灵", "鬼火", "变形怪", "二重身", "灯神",
  "史莱姆", "宝箱怪", "活化铠甲", "活化雕像", "魔像", "石像鬼", "活化稻草人", "睡魔",
  "自动机关人", "发条机器人", "蒸汽机器人", "水晶机器人", "木制机器人", "石质机器人", "青铜机器人", "钢铁机器人",
  "机械兽", "机械鸟", "机械龙", "机械昆虫", "发条骑士", "奥术机械", "符文守卫", "瓷偶生命",
  "纸魔像", "黏土魔像", "冰魔像", "熔岩魔像", "藤蔓魔像", "白骨魔像", "玻璃魔像", "暗影魔像",
  "食梦兽", "梦魇兽", "光裔", "影裔", "虚空生物", "时间漫游者", "梦境守护者", "混沌衍生体",
] as const;

export const PRIMARY_SPECIES_GROUPS = [
  { key: "natural-life", label: "Natural organism", labelZh: "现实自然生物", start: 0, end: 64 },
  { key: "natural-nonliving", label: "Natural nonliving entity", labelZh: "自然非生物", start: 64, end: 128 },
  { key: "fantasy", label: "Fantasy race", labelZh: "幻想种族", start: 128, end: 256 },
] as const;

export const AUXILIARY_ENTITIES = [
  "fire", "water", "light", "sun", "lightning", "ice", "wind", "earth",
  "shadow", "moon", "metal", "mist", "poison", "sound", "void", "nature",
] as const;

export const AUXILIARY_ENTITIES_ZH = [
  "火", "水", "光明", "太阳", "雷电", "冰霜", "风", "大地",
  "暗影", "月亮", "金属", "雾气", "毒素", "声音", "虚空", "自然",
] as const;

/** Token paired with a primary anchor: 16 forms × 16 bases = 256 named primary kinds. */
export const PRIMARY_ENTITY_FORMS = [
  "colossus", "guardian", "oracle", "sovereign", "pilgrim", "herald", "artisan", "sentinel",
  "dancer", "sage", "titan", "spirit", "champion", "muse", "keeper", "avatar",
] as const;

export const PRIMARY_ENTITY_FORMS_ZH = [
  "巨像", "守护者", "神谕者", "君王", "朝圣者", "先驱", "工匠", "哨卫",
  "舞者", "贤者", "泰坦", "精灵", "英杰", "缪斯", "守藏者", "化身",
] as const;

export const PRIMARY_ENTITY_BEARINGS = [
  "serene", "noble", "radiant", "vigilant", "contemplative", "regal", "graceful", "resolute",
  "benevolent", "enigmatic", "jubilant", "solemn", "harmonious", "courageous", "merciful", "transcendent",
] as const;

export const PRIMARY_ENTITY_BEARINGS_ZH = [
  "宁静", "高贵", "光辉", "警醒", "沉思", "王者", "优雅", "坚毅",
  "仁善", "玄妙", "欢欣", "庄严", "和谐", "勇毅", "慈悲", "超然",
] as const;

export const PRIMARY_ENTITY_SCALES = [
  "miniature", "delicate", "compact", "slender", "life-sized", "broad", "tall", "towering",
  "monumental", "colossal", "vast", "elevated", "panoramic", "celestial", "cosmic", "boundless",
] as const;

export const PRIMARY_ENTITY_SCALES_ZH = [
  "微型", "精巧", "紧凑", "修长", "等身", "宽阔", "高挑", "高耸",
  "纪念碑式", "庞然", "宏大", "崇高", "全景式", "天界尺度", "宇宙尺度", "无垠",
] as const;

export const PRIMARY_ENTITY_REGALIA = [
  "unadorned", "crowned", "haloed", "robed", "armored", "gilded", "jewelled", "laureled",
  "inscribed", "garlanded", "ribboned", "crested", "mantled", "sculpted", "luminous", "ceremonial",
] as const;

export const PRIMARY_ENTITY_REGALIA_ZH = [
  "无饰", "戴冠", "带光环", "披袍", "着甲", "鎏金", "饰宝石", "戴桂冠",
  "铭文装饰", "花环装饰", "飘带装饰", "冠饰", "披风", "雕塑般", "发光", "仪式装束",
] as const;

/** Token paired with an auxiliary anchor: 16 manifestations × 16 bases = 256 named auxiliary kinds. */
export const AUXILIARY_ENTITY_MANIFESTATIONS = [
  "essence", "aura", "current", "halo", "crown", "pulse", "veil", "crystal",
  "storm", "tide", "arc", "chorus", "mantle", "sigil", "breath", "domain",
] as const;

export const AUXILIARY_ENTITY_MANIFESTATIONS_ZH = [
  "精粹", "灵气", "流", "光环", "冠冕", "脉动", "帷幕", "晶体",
  "风暴", "潮汐", "弧光", "合唱", "披风", "印记", "吐息", "领域",
] as const;

export const AUXILIARY_ENTITY_CADENCES = [
  "gentle", "flowing", "radiant", "resonant", "serene", "surging", "ascending", "orbiting",
  "rhythmic", "cascading", "luminous", "balanced", "ceremonial", "majestic", "primordial", "transcendent",
] as const;

export const AUXILIARY_ENTITY_CADENCES_ZH = [
  "轻柔", "流动", "光辉", "共鸣", "宁静", "奔涌", "上升", "环行",
  "有韵律", "层叠流下", "明亮", "均衡", "仪式化", "庄严", "原初", "超然",
] as const;

export const AUXILIARY_ENTITY_REACHES = [
  "focused", "surrounding", "horizon-wide", "skyward", "earthbound", "inward", "outward", "spiraling",
  "encircling", "layered", "converging", "expanding", "vaulted", "atmospheric", "cosmic", "boundless",
] as const;

export const AUXILIARY_ENTITY_REACHES_ZH = [
  "聚焦", "环绕", "横贯地平线", "向天", "贴近大地", "向内", "向外", "螺旋延展",
  "围合", "分层", "汇聚", "扩张", "穹顶式", "弥漫大气", "宇宙尺度", "无边界",
] as const;

export const AUXILIARY_ENTITY_CHARACTERS = [
  "pure", "harmonious", "vivid", "subtle", "noble", "tranquil", "vital", "lucid",
  "opaline", "gilded", "prismatic", "tempered", "exalted", "sacred", "mythic", "eternal",
] as const;

export const AUXILIARY_ENTITY_CHARACTERS_ZH = [
  "纯净", "和谐", "鲜明", "微妙", "高贵", "安宁", "充满生机", "澄澈",
  "蛋白石般", "鎏金", "棱镜般", "调和", "崇高", "神圣", "神话般", "永恒",
] as const;

export const DESCRIPTOR_FAMILIES = [
  "overall-form", "contour", "proportion", "topology", "symmetry", "segmentation", "repetition", "curvature",
  "boundary", "surface", "internal-structure", "density", "optical-response", "color-relation", "continuity", "complexity",
] as const;

export const DESCRIPTOR_FAMILIES_ZH = [
  "整体形态", "轮廓", "比例", "拓扑结构", "对称性", "分节", "重复规律", "曲率",
  "边界", "表面", "内部结构", "密度", "光学响应", "色彩关系", "连续性", "复杂度",
] as const;

export const DESCRIPTOR_INTENSITIES = [
  "delicately", "subtly", "lightly", "gracefully", "softly", "moderately", "noticeably", "clearly",
  "boldly", "richly", "intricately", "broadly", "selectively", "rhythmically", "harmoniously", "majestically",
] as const;

export const DESCRIPTOR_INTENSITIES_ZH = [
  "精致地", "微妙地", "轻盈地", "优雅地", "柔和地", "适度地", "显著地", "清晰地",
  "鲜明地", "丰美地", "细腻地", "开阔地", "选择性地", "有韵律地", "和谐地", "庄严地",
] as const;

export const DESCRIPTOR_TERMS: readonly (readonly string[])[] = [
  ["rounded", "statuesque", "elongated", "compact", "faceted", "flowing", "tapered", "radial", "axial", "arborescent", "vaulted", "monolithic", "tiered", "spiraled", "crowned", "balanced-volume"],
  ["smooth-edged", "angular", "sweeping", "undulating", "stepped", "arched", "clean-lined", "beveled", "scalloped", "crisp", "soft-edged", "rhythmic", "enclosed", "expansive", "sculpted", "ribbon-like"],
  ["harmonious", "golden-ratio", "slender", "generous", "lofty", "grounded", "expanded", "condensed", "centered", "offset", "top-emphasized", "base-emphasized", "evenly-scaled", "graduated", "ascending", "panoramic"],
  ["connected", "nested", "interwoven", "looped", "interlocked", "fused", "modular", "arcaded", "constellated", "isolated", "ringed", "latticed", "recursive", "terraced", "linked", "orbiting"],
  ["bilateral", "ray-symmetric", "rotational", "mirrored", "approximate", "offset-symmetry", "alternating-balance", "local-balance", "global-balance", "multi-axis", "skew-balanced", "dynamic", "counterpoised", "harmonic", "crystalline-order", "axial-symmetry"],
  ["unified", "paneled", "partitioned", "banded", "sectioned", "articulated", "framed", "tiled", "columned", "interleaved", "cadenced", "graduated-sections", "motif-divided", "ribboned", "joined", "gently-separated"],
  ["periodic", "syncopated", "alternating", "echoed", "sequenced", "rhythmic-cadence", "ordered", "progressive", "ascending-cadence", "descending-cadence", "concentric", "mirrored-cadence", "offset-cadence", "spacious", "intricate-cadence", "ceremonial"],
  ["planar", "bow-shaped", "gently-concave", "gently-convex", "helical", "coiled", "torsioned", "bowed", "wave-like", "pleated", "sinuous", "chamfered", "circular", "narrowing", "flared", "recurved"],
  ["well-defined", "diffused", "crisp-boundary", "softened", "haloed", "luminous-rimmed", "seamless", "filigreed", "gilded-edge", "outlined", "embedded", "overlapping", "inset", "embossed", "shadow-lined", "radiant-edged"],
  ["polished", "satin", "velvety", "pearlescent", "opalescent", "matte", "enamelled", "marbled", "silk-like", "brushed-metal", "crystalline", "woven", "glasslike", "ivory-smooth", "gilded", "lustrous"],
  ["monolithic-core", "layered-core", "crystalline-core", "vaulted-core", "filamented-core", "geometric-core", "radiating-core", "tiered-core", "nested-core", "continuous-core", "structured-core", "columnar-core", "harmonized-core", "luminous-core", "balanced-core", "coherent-core"],
  ["airy", "substantial", "evenly-spaced", "gently-concentrated", "open-spaced", "richly-filled", "distributed-field", "constellation-spread", "uniform-field", "varied-field", "center-weighted", "softly-dispersed", "tier-distributed", "peripheral", "balanced-density", "gradient-weighted"],
  ["reflective", "translucent", "opaque", "transparent", "luminous", "iridescent", "glossy", "softly-diffusive", "refractive", "shimmering", "pearly-glow", "radiant", "moonlit", "sunlit", "prismatic", "softly-shadowed"],
  ["monochromatic", "contrasting", "gradient", "color-banded", "accented", "tonal-layered", "muted", "saturated", "pale", "deep-toned", "warm-shifted", "cool-shifted", "complementary", "analogous", "jewel-toned", "variegated"],
  ["unbroken", "gently-discontinuous", "gradual", "decisive", "alternating-flow", "softly-paused", "blended", "separated", "progressive-flow", "recurring", "localized-flow", "distributed-flow", "stable", "variable-flow", "transitional", "gracefully-divided"],
  ["minimal", "simple", "measured", "intricate", "recursive-detail", "stratified", "richly-detailed", "spacious-detail", "ordered-complexity", "organic-complexity", "fine", "bold-detail", "focalized", "widely-articulated", "motif-rich", "emergent"],
] as const;

export const DESCRIPTOR_TERMS_ZH: readonly (readonly string[])[] = [
  ["圆润", "雕塑般挺拔", "修长", "紧凑", "多面", "流动", "渐收", "放射", "轴向", "树冠式", "穹顶式", "整体雕成", "阶层式", "螺旋上升", "冠冕式", "体量均衡"],
  ["平滑收边", "棱角分明", "舒展", "起伏", "阶梯式", "拱形", "线条纯净", "斜面收边", "花瓣波缘", "清晰利落", "柔和边缘", "韵律化", "围合", "开阔", "雕刻感", "缎带般"],
  ["和谐", "黄金比例", "纤长", "丰盈", "高挑", "稳重", "舒展", "凝练", "居中", "错位", "上部强调", "基部强调", "尺度均称", "渐次变化", "向上延伸", "全景式"],
  ["连通", "嵌套", "交织", "回环", "互锁", "融合", "模块化", "拱廊式", "星座式", "独立", "环绕", "格构式", "递归", "台地式", "链结", "轨道式"],
  ["双侧均衡", "光芒式对称", "旋转对称", "镜像", "近似均衡", "偏移对称", "交替均衡", "局部均衡", "全局均衡", "多轴", "倾斜均衡", "动态均衡", "对位", "和声式", "晶体秩序", "轴向对称"],
  ["统一", "镶板式", "分区", "带状", "分段", "关节清晰", "框架式", "拼片式", "柱列式", "交错编排", "节奏分段", "渐次分段", "纹样分区", "飘带式", "衔接", "柔和分离"],
  ["周期性", "切分节奏", "交替", "回响", "序列化", "韵律反复", "有序", "渐进", "上升节奏", "下降节奏", "同心式", "镜像节奏", "错位节奏", "留白充足", "繁复节奏", "仪式化"],
  ["平面化", "弓形", "柔和内曲", "柔和外曲", "螺旋曲线", "盘旋", "扭转", "弯弓式", "波浪般", "褶裥式", "蜿蜒", "倒角式", "圆环曲线", "渐窄", "外展", "回卷"],
  ["界限明确", "柔化弥散", "边界清朗", "柔和过渡", "光环围绕", "发光轮缘", "无缝", "金丝细工", "鎏金边缘", "描线", "嵌入", "叠合", "内嵌", "浮雕般", "暗线勾勒", "光辉收边"],
  ["抛光", "缎面", "天鹅绒般", "珍珠光泽", "蛋白石般", "哑光", "珐琅般", "大理石纹", "丝绸般", "拉丝金属", "水晶般", "织物感", "玻璃般", "象牙般细腻", "鎏金", "润泽"],
  ["整体式核心", "层叠核心", "晶体核心", "穹顶核心", "丝状核心", "几何核心", "辐射核心", "阶层核心", "嵌套核心", "连续核心", "结构化核心", "柱列核心", "协调核心", "发光核心", "均衡核心", "连贯核心"],
  ["轻盈", "充实", "间距均匀", "柔和集中", "疏朗", "丰盈填充", "场域分布", "星座散布", "均匀场", "变化场", "中心加重", "柔和舒散", "阶层分布", "外围分布", "密度均衡", "渐变权重"],
  ["反射", "半透明", "不透明", "透明", "发光", "虹彩", "光泽", "柔和漫射", "折射", "闪耀", "珍珠辉光", "明亮", "月光般", "日光般", "棱镜般", "柔和阴影"],
  ["单色", "对比色", "渐变", "色带式", "点睛配色", "色调层叠", "低饱和", "高饱和", "浅淡", "深色调", "偏暖", "偏冷", "互补色", "邻近色", "宝石色调", "斑斓变化"],
  ["完整延续", "柔和断续", "渐进", "明确转折", "交替流动", "轻柔停顿", "融合", "分离", "渐进流动", "循环再现", "局部流动", "广域流动", "稳定", "变化流动", "过渡", "优雅分流"],
  ["极简", "简洁", "适度", "繁复", "递归细节", "分层组织", "丰富细节", "留白式细节", "有序复杂", "有机复杂", "精细", "鲜明细节", "焦点化", "广域展开", "纹样丰富", "涌现"],
] as const;

if (PRIMARY_ENTITIES.length !== 16 || PRIMARY_ENTITIES_ZH.length !== 16 ||
    PRIMARY_SPECIES.length !== 256 || PRIMARY_SPECIES_ZH.length !== 256 ||
    AUXILIARY_ENTITIES.length !== 16 || AUXILIARY_ENTITIES_ZH.length !== 16 ||
    [PRIMARY_ENTITY_FORMS, PRIMARY_ENTITY_FORMS_ZH, PRIMARY_ENTITY_BEARINGS, PRIMARY_ENTITY_BEARINGS_ZH,
      PRIMARY_ENTITY_SCALES, PRIMARY_ENTITY_SCALES_ZH, PRIMARY_ENTITY_REGALIA, PRIMARY_ENTITY_REGALIA_ZH,
      AUXILIARY_ENTITY_MANIFESTATIONS, AUXILIARY_ENTITY_MANIFESTATIONS_ZH, AUXILIARY_ENTITY_CADENCES,
      AUXILIARY_ENTITY_CADENCES_ZH, AUXILIARY_ENTITY_REACHES, AUXILIARY_ENTITY_REACHES_ZH,
      AUXILIARY_ENTITY_CHARACTERS, AUXILIARY_ENTITY_CHARACTERS_ZH].some((items) => items.length !== 16) ||
    DESCRIPTOR_FAMILIES.length !== 16 || DESCRIPTOR_FAMILIES_ZH.length !== 16 ||
    DESCRIPTOR_INTENSITIES.length !== 16 || DESCRIPTOR_INTENSITIES_ZH.length !== 16 ||
    DESCRIPTOR_TERMS.some((terms) => terms.length !== 16) || DESCRIPTOR_TERMS_ZH.some((terms) => terms.length !== 16)) {
  throw new Error("Eros vocabulary must use sixteen-way token fields");
}
