import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "../protocol/hex";
import { EROS_VISUAL_STYLE } from "../protocol/prompt";

export const TREASURE_PROTOCOL_VERSION = "eros-treasure-v6";
export const TREASURE_MAX_ATTEMPTS = 3;
export const TREASURE_TARGET_SEARCH_SUCCESS = 0.1;

export const MEPHISTO_GREETING = "我是永远否定的精灵，是总想行恶却行了善的力量的一部分。发生的一切终将毁灭，不如借我的戏法神游八方。我是梅菲斯特，告诉我你的咒语，借你我的魔力搜罗万千宝物";

export const TREASURE_SUBJECT_GROUPS = [
  { name: "宝石与珠玉珍品", subjects: [
    "宝珠", "珍珠", "珠串", "珠冠", "水晶球", "水晶柱", "水晶簇", "水晶碎片",
    "宝石原石", "切面宝石", "雕刻宝石", "印章宝石", "琥珀", "玛瑙", "翡翠", "珊瑚珠",
    "猫眼石", "蛋白石", "青金石", "绿松石", "紫水晶", "石榴石", "蓝宝石", "红宝石",
    "祖母绿", "月长石", "黑曜石", "缟玛瑙", "珍珠母片", "宝石玫瑰", "水晶泪滴", "宝石圆盘",
  ] },
  { name: "贵金属与铸造珍品", subjects: [
    "金锭", "银锭", "金币", "银币", "古代钱币", "金珠", "银珠", "金片",
    "银片", "金线", "银线", "金链", "银链", "金环", "银环", "金盘",
    "银盘", "金杯", "银杯", "金碗", "银碗", "金匣", "银匣", "金像",
    "银像", "黄金面具", "白银面具", "金质徽章", "银质徽章", "金属圣牌", "铸金浮雕", "镶银饰板",
  ] },
  { name: "冠饰与佩戴珍品", subjects: [
    "王冠", "冠冕", "桂冠", "头环", "额冠", "宝石发网", "耳环", "耳坠",
    "项链", "项圈", "吊坠", "护身坠", "胸针", "斗篷别针", "戒指", "印戒",
    "手镯", "臂环", "脚环", "腰链", "宝石腰带", "华丽带扣", "肩饰", "披肩扣",
    "华丽披风", "绣纹长袍", "丝质面纱", "宝石手套", "镶饰长靴", "仪式面具", "羽饰头冠", "金属颈环",
  ] },
  { name: "器皿与祭仪珍品", subjects: [
    "宝箱", "珍宝匣", "首饰盒", "圣物匣", "圣杯", "高脚杯", "角杯", "双耳杯",
    "酒壶", "水壶", "双耳瓶", "细颈瓶", "香膏瓶", "香炉", "火盆", "烛台",
    "油灯", "提灯", "宝镜", "献祭碗", "奠酒盘", "供奉盘", "仪式铃", "银铃",
    "祭坛盒", "圣水瓶", "骨灰瓮", "宝石罐", "密封陶罐", "铭文陶瓶", "雕花木盒", "锁扣铁箱",
  ] },
  { name: "古物与典藏珍品", subjects: [
    "古镜", "古币", "古印", "古锁", "古钥匙", "古钟", "古灯", "古瓶",
    "古罐", "古匣", "竖琴", "七弦琴", "排箫", "号角", "手鼓", "古代棋盘",
    "羊皮书卷", "泥板文书", "手抄典籍", "彩绘手稿", "古代地图", "星象图", "家谱卷册", "石刻铭文",
    "青铜铭牌", "残破石碑", "蜡板", "印章滚筒", "大理石雕像", "青铜雕像", "古代面具", "神庙残片",
  ] },
  { name: "武具与防护珍品", subjects: [
    "长剑", "短剑", "阔剑", "匕首", "长矛", "标枪", "战斧", "双刃斧",
    "战锤", "权杖锤", "长弓", "短弓", "弩", "箭囊", "箭簇", "投石索",
    "圆盾", "长盾", "塔盾", "头盔", "带翼头盔", "面甲", "胸甲", "锁子甲",
    "鳞甲", "臂甲", "护手", "腿甲", "护胫", "护心镜", "剑鞘", "仪仗武器",
  ] },
  { name: "自然遗物与珍稀材料", subjects: [
    "奇石", "水晶洞石", "矿晶", "金砂", "银砂", "磁石", "陨石", "盐晶",
    "化石", "巨兽骨", "兽牙", "长牙", "兽角", "鹿角", "巨型甲壳", "鳞片",
    "彩色羽毛", "珍稀兽皮", "白色毛皮", "珍珠母贝", "巨型贝壳", "海螺", "珊瑚枝", "琥珀虫珀",
    "香木", "黑檀木", "橄榄木", "橡木心材", "树瘤", "扭曲树根", "巨型种子", "石化木",
  ] },
  { name: "奇物、权杖与机关珍品", subjects: [
    "权杖", "短杖", "仪式杖", "牧杖", "宝球", "王权宝球", "罗盘", "星盘",
    "日晷", "沙漏", "水钟", "怀表", "音乐盒", "机关盒", "暗格匣", "密码盘",
    "连环锁", "发条装置", "机械鸟", "机械兽", "自动人偶", "机械球", "万花筒", "望远镜",
    "单筒镜", "放大镜", "炼金坩埚", "精密天平", "占卜骰子", "占卜骨牌", "命运纺锤", "仪式号角",
  ] },
] as const;

export const TREASURE_SUBJECTS = TREASURE_SUBJECT_GROUPS.flatMap((group) => [...group.subjects]);
if (TREASURE_SUBJECTS.length !== 256) throw new Error("Treasure subject vocabulary must contain exactly 256 entries");

export const TREASURE_SUBJECT_GROUPS_EN = [
  { name: "Gemstones and Jewels", subjects: [
    "Jeweled Orb", "Pearl", "Pearl Strand", "Jeweled Crown", "Crystal Ball", "Crystal Pillar", "Crystal Cluster", "Crystal Shard",
    "Rough Gemstone", "Faceted Gemstone", "Carved Gemstone", "Signet Gemstone", "Amber", "Agate", "Jade", "Coral Bead",
    "Cat's-eye Gemstone", "Opal", "Lapis Lazuli", "Turquoise", "Amethyst", "Garnet", "Sapphire", "Ruby",
    "Emerald", "Moonstone", "Obsidian", "Onyx", "Mother-of-pearl Plaque", "Gemstone Rose", "Crystal Teardrop", "Gemstone Disc",
  ] },
  { name: "Precious Metals and Cast Treasures", subjects: [
    "Gold Ingot", "Silver Ingot", "Gold Coin", "Silver Coin", "Ancient Coin", "Gold Bead", "Silver Bead", "Gold Leaf",
    "Silver Leaf", "Gold Thread", "Silver Thread", "Gold Chain", "Silver Chain", "Gold Ring", "Silver Ring", "Gold Platter",
    "Silver Platter", "Gold Goblet", "Silver Goblet", "Gold Bowl", "Silver Bowl", "Gold Casket", "Silver Casket", "Gold Statuette",
    "Silver Statuette", "Golden Mask", "Silver Mask", "Gold Badge", "Silver Badge", "Metal Sacred Medallion", "Cast-gold Relief", "Silver-inlaid Panel",
  ] },
  { name: "Regalia and Adornments", subjects: [
    "Royal Crown", "Diadem", "Laurel Wreath", "Circlet", "Forehead Diadem", "Jeweled Hairnet", "Earring", "Drop Earring",
    "Necklace", "Torc", "Pendant", "Protective Amulet", "Brooch", "Cloak Pin", "Ring", "Signet Ring",
    "Bracelet", "Armlet", "Anklet", "Waist Chain", "Jeweled Belt", "Ornate Buckle", "Shoulder Ornament", "Shawl Clasp",
    "Ornate Cloak", "Embroidered Robe", "Silk Veil", "Jeweled Gloves", "Ornamented Boots", "Ritual Mask", "Feathered Headdress", "Metal Torc",
  ] },
  { name: "Vessels and Ritual Treasures", subjects: [
    "Treasure Chest", "Jewel Casket", "Jewelry Box", "Reliquary", "Sacred Chalice", "Goblet", "Horn Cup", "Two-handled Cup",
    "Wine Jug", "Water Jug", "Amphora", "Slender-necked Bottle", "Unguent Bottle", "Incense Burner", "Brazier", "Candlestick",
    "Oil Lamp", "Lantern", "Jeweled Mirror", "Offering Bowl", "Libation Tray", "Offering Platter", "Ritual Bell", "Silver Bell",
    "Altar Box", "Holy Water Flask", "Funerary Urn", "Jeweled Jar", "Sealed Ceramic Jar", "Inscribed Vase", "Carved Wooden Box", "Iron Lockbox",
  ] },
  { name: "Antiquities and Collectibles", subjects: [
    "Ancient Mirror", "Ancient Coin", "Ancient Seal", "Ancient Lock", "Ancient Key", "Ancient Clock", "Ancient Lamp", "Ancient Bottle",
    "Ancient Jar", "Ancient Casket", "Lyre", "Kithara", "Panpipes", "Horn", "Hand Drum", "Ancient Game Board",
    "Parchment Scroll", "Clay Tablet", "Handwritten Codex", "Illuminated Manuscript", "Ancient Map", "Astral Chart", "Genealogical Scroll", "Stone Inscription",
    "Bronze Plaque", "Broken Stele", "Wax Tablet", "Cylinder Seal", "Marble Statue", "Bronze Statue", "Ancient Mask", "Temple Fragment",
  ] },
  { name: "Weapons and Armor", subjects: [
    "Longsword", "Shortsword", "Broadsword", "Dagger", "Spear", "Javelin", "Battle Axe", "Double-headed Axe",
    "War Hammer", "Scepter Mace", "Longbow", "Shortbow", "Crossbow", "Quiver", "Arrow Bundle", "Sling",
    "Round Shield", "Long Shield", "Tower Shield", "Helmet", "Winged Helmet", "Visor", "Breastplate", "Chainmail",
    "Scale Armor", "Vambrace", "Gauntlet", "Leg Armor", "Greave", "Heart Guard", "Scabbard", "Ceremonial Weapon",
  ] },
  { name: "Natural Relics and Rare Materials", subjects: [
    "Curious Stone", "Crystal Geode", "Mineral Crystal", "Gold Dust", "Silver Dust", "Lodestone", "Meteorite", "Salt Crystal",
    "Fossil", "Colossal Beast Bone", "Beast Tooth", "Tusk", "Beast Horn", "Antler", "Giant Carapace", "Scale",
    "Colorful Feather", "Rare Hide", "White Pelt", "Mother-of-pearl Shell", "Giant Seashell", "Conch", "Coral Branch", "Insect-bearing Amber",
    "Aromatic Wood", "Ebony", "Olive Wood", "Oak Heartwood", "Burl", "Twisted Root", "Giant Seed", "Petrified Wood",
  ] },
  { name: "Curiosities, Scepters, and Mechanisms", subjects: [
    "Scepter", "Wand", "Ritual Staff", "Shepherd's Crook", "Orb", "Royal Orb", "Compass", "Astrolabe",
    "Sundial", "Hourglass", "Water Clock", "Pocket Watch", "Music Box", "Puzzle Box", "Hidden-compartment Casket", "Cipher Disc",
    "Puzzle Lock", "Clockwork Device", "Mechanical Bird", "Mechanical Beast", "Automaton", "Mechanical Sphere", "Kaleidoscope", "Telescope",
    "Monocular", "Magnifying Glass", "Alchemical Crucible", "Precision Balance", "Divination Dice", "Divination Tiles", "Spindle of Fate", "Ritual Horn",
  ] },
] as const;

export const TREASURE_SUBJECTS_EN = TREASURE_SUBJECT_GROUPS_EN.flatMap((group) => [...group.subjects]);
if (TREASURE_SUBJECT_GROUPS_EN.length !== TREASURE_SUBJECT_GROUPS.length || TREASURE_SUBJECT_GROUPS_EN.some((group, index) => group.subjects.length !== TREASURE_SUBJECT_GROUPS[index].subjects.length) || TREASURE_SUBJECTS_EN.length !== 256)
  throw new Error("English treasure subject vocabulary must mirror all 256 Chinese entries");

const intensityZh = ["含蓄的", "清澈的", "柔和的", "明亮的", "沉静的", "庄严的", "典雅的", "精致的", "古朴的", "华贵的", "神秘的", "神圣的", "恒久的", "梦幻的", "宏伟的", "超凡的"] as const;
const intensityEn = ["subtle", "clear", "gentle", "luminous", "serene", "solemn", "elegant", "refined", "antique", "regal", "mysterious", "sacred", "timeless", "dreamlike", "monumental", "otherworldly"] as const;

const descriptorFamilies = [
  ["presence", "视觉气质", ["克制气质", "清雅气质", "沉静气质", "温和气质", "庄严气质", "典雅气质", "神秘气质", "神圣气质", "古朴气质", "梦幻气质", "英雄气质", "诗意气质", "恒久气质", "超凡气质", "和谐气质", "纪念性气质"], ["restrained presence", "graceful presence", "quiet presence", "gentle presence", "solemn presence", "elegant presence", "mysterious presence", "sacred presence", "antique presence", "dreamlike presence", "heroic presence", "poetic presence", "timeless presence", "otherworldly presence", "harmonious presence", "monumental presence"]],
  ["palette_relation", "配色关系", ["单色层次", "近似色协调", "冷暖平衡", "明暗协调", "低饱和配色", "中性色调", "深浅递进", "局部色彩强调", "柔和色彩过渡", "克制对比", "清澈色域", "温暖色域", "冷静色域", "古典色彩平衡", "暮光般色调", "晨光般色调"], ["monochromatic tonality", "analogous-color harmony", "balanced warm and cool tones", "balanced light and dark values", "low-saturation color", "neutral tonality", "graduated values", "a localized color accent", "soft color transitions", "restrained contrast", "a clear color range", "a warm color range", "a cool color range", "classical color balance", "twilight tonality", "dawn tonality"]],
  ["illumination", "光线表现", ["柔和漫射光", "清晰轮廓光", "均衡正面光", "侧向柔光", "顶部柔光", "低角度微光", "烛光般照明", "月光般照明", "晨曦般照明", "金色环境光", "冷色环境光", "局部聚光", "渐变明暗", "柔和阴影", "深色背景衬光", "内敛明亮强调"], ["soft diffused light", "clear rim light", "balanced frontal light", "soft side light", "soft overhead light", "a low-angle glimmer", "candlelike illumination", "moonlike illumination", "dawnlike illumination", "golden ambient light", "cool ambient light", "localized illumination", "graduated light and shade", "soft shadows", "light against a dark background", "restrained luminous emphasis"]],
  ["rendering", "呈现方式", ["细腻写实呈现", "柔和绘画性呈现", "清晰轮廓呈现", "雕塑感呈现", "层次分明呈现", "克制细节呈现", "统一质感呈现", "古典画面呈现", "精确比例呈现", "柔和过渡呈现", "深浅塑形呈现", "局部精细呈现", "整体优先呈现", "平衡细节呈现", "富有历史感的呈现", "诗意写实呈现"], ["finely realistic rendering", "soft painterly rendering", "clearly defined rendering", "sculptural rendering", "well-layered rendering", "restrained detail rendering", "visually unified rendering", "classical pictorial rendering", "carefully proportioned rendering", "softly transitioned rendering", "tonally modeled rendering", "selectively detailed rendering", "whole-form-first rendering", "balanced detail rendering", "historically evocative rendering", "poetic realistic rendering"]],
  ["era", "时代", ["创世初期", "远古王朝", "英雄时代", "神庙盛期", "海上诸国", "失落城邦", "先知年代", "青铜纪元", "白银纪元", "黄金纪元", "长夜年代", "复兴年代", "无名世纪", "旧约时代", "末代王朝", "时间之外"], ["the dawn of creation", "an ancient dynasty", "the heroic age", "the high temple era", "the age of sea kingdoms", "a lost city-state", "the age of prophets", "the bronze age", "the silver age", "the golden age", "the long night", "an age of renewal", "an unnamed century", "an age of old covenants", "the last dynasty", "outside time"]],
  ["visual_balance", "画面均衡", ["中心稳定", "视觉均衡", "疏朗留白", "沉静重心", "轻盈呼吸感", "上下协调", "左右协调", "前后层次", "主次清晰", "克制张力", "柔和节奏", "庄严秩序", "自然平衡", "静态凝聚", "开阔空间感", "聚焦明确"], ["centered stability", "visual equilibrium", "generous negative space", "a calm visual center", "an airy sense of space", "upper-and-lower balance", "left-and-right balance", "layered spatial depth", "clear visual hierarchy", "restrained tension", "a gentle visual rhythm", "solemn order", "natural balance", "quiet visual cohesion", "an open sense of space", "a clearly focused composition"]],
  ["ornament", "纹饰", ["月桂叶", "橄榄枝", "葡萄藤", "海浪", "云纹", "日轮", "月相", "星辰", "羽翼", "花瓣", "蛇形线", "狮鬃", "鱼鳞", "雷纹", "回纹", "无纹素面"], ["laurel leaves", "olive branches", "grapevines", "sea waves", "cloud scrolls", "solar discs", "moon phases", "stars", "wings", "petals", "serpentine lines", "lion manes", "scale patterns", "thunder motifs", "meanders", "an unadorned surface"]],
  ["ornament_layout", "纹饰布局", ["中心留白", "边缘环绕", "轴线对称", "放射均衡", "疏朗间隔", "连续边饰", "层叠边框", "单侧点缀", "上下呼应", "左右呼应", "局部聚焦", "均匀散布", "纵向延展", "横向展开", "柔和渐变", "克制布局"], ["central negative space", "border-framing ornament", "axial symmetry", "radial balance", "widely spaced accents", "a continuous border band", "nested border layers", "a single-sided accent", "balanced upper and lower details", "balanced left and right details", "a localized focal accent", "evenly distributed detail", "vertical visual emphasis", "horizontal visual emphasis", "softly graduated detail", "restrained ornament placement"]],
  ["inscription", "铭文", ["无字", "单行祷文", "环形誓言", "主人姓名", "星象符号", "古代数记", "航海方位", "神庙献词", "胜利颂辞", "悼亡短句", "王室箴言", "预言残句", "工匠印记", "城邦徽记", "神秘字母", "不可解读的诗句"], ["no inscription", "a single-line prayer", "a circular oath", "the owner's name", "astral signs", "ancient numerals", "nautical directions", "a temple dedication", "a victory hymn", "a mourning phrase", "a royal maxim", "a fragment of prophecy", "a maker's mark", "a city emblem", "mystic letters", "an undeciphered verse"]],
  ["condition", "保存状态", ["完好如初", "精心修复", "轻微旧化", "边缘柔和磨损", "带有古雅包浆", "略有褪色", "保存于丝绒中", "受蜡封保护", "经海风洗礼", "经圣油养护", "留有礼仪痕迹", "历经传承", "沉睡已久", "从遗迹中净化", "刚被唤醒", "不受岁月侵蚀"], ["pristine", "carefully restored", "gently aged", "softly worn at the edges", "bearing an antique patina", "slightly faded", "preserved in velvet", "protected by a wax seal", "weathered by sea air", "maintained with sacred oil", "marked by ritual use", "passed through generations", "long dormant", "purified from ruins", "newly awakened", "untouched by age"]],
  ["aura", "气韵", ["宁静", "庄重", "喜悦", "勇敢", "智慧", "慈悲", "忠贞", "自由", "希望", "怀旧", "守护", "荣耀", "和谐", "命运感", "神谕感", "不可言说"], ["serenity", "solemnity", "joy", "courage", "wisdom", "compassion", "devotion", "freedom", "hope", "nostalgia", "protection", "glory", "harmony", "a sense of fate", "an oracular presence", "an ineffable presence"]],
  ["gift", "魔力", ["指引归途", "守护梦境", "照见真心", "平息风浪", "鼓舞勇气", "保存记忆", "唤起灵感", "辨认誓言", "温暖持有者", "回应月光", "回应晨曦", "记录星轨", "传递远方回声", "揭示隐藏道路", "衡量命运", "沉默地守望"], ["guiding the way home", "guarding dreams", "revealing the true heart", "calming storms", "inspiring courage", "preserving memories", "awakening inspiration", "recognizing oaths", "warming its bearer", "answering moonlight", "answering dawn", "recording star paths", "carrying distant echoes", "revealing hidden paths", "weighing fate", "keeping a silent vigil"]],
  ["detail_finish", "细部处理", ["无缝收束", "柔和倒角", "清晰边线", "细腻浅浮", "平滑过渡", "均衡层次", "克制接缝", "手工微差", "触点抛光", "凹处哑光", "柔和色阶", "精细勾边", "准确对齐", "边缘轻磨", "柔塑深度", "统一工艺"], ["seamless finishing", "softly beveled edges", "crisp edge definition", "delicate low-relief detail", "smooth transitions", "balanced layering", "restrained seams", "subtle hand-finished variation", "polished contact points", "matte recessed areas", "gentle tonal transitions", "finely outlined forms", "precise alignment", "lightly worn edges", "softly modeled depth", "unified craftsmanship"]],
  ["provenance", "来历", ["王室宝库", "海滨神庙", "山林祭所", "失落城邦", "古代工坊", "英雄墓室", "先知书房", "远航船队", "和平盟约", "婚礼仪式", "丰收祭典", "凯旋队伍", "隐修者居所", "地下圣库", "世代家藏", "无人知晓之地"], ["a royal treasury", "a coastal temple", "a woodland shrine", "a lost city-state", "an ancient workshop", "a hero's tomb", "a prophet's study", "a seafaring fleet", "a peace covenant", "a wedding rite", "a harvest festival", "a triumphal procession", "a hermit's dwelling", "a subterranean sanctuary", "a family collection", "an unknown place"]],
  ["presentation", "陈设", ["置于深色丝绒", "置于白色大理石", "置于青铜台座", "收在木匣中", "悬于细链", "覆以轻纱", "伴随月桂叶", "伴随橄榄枝", "伴随烛光", "伴随晨光", "伴随海雾", "伴随金色尘光", "由双手托起", "独立陈列", "封存在玻璃罩内", "漂浮于幽暗背景前"], ["on dark velvet", "on white marble", "on a bronze pedestal", "inside a wooden casket", "suspended from a fine chain", "veiled in light fabric", "beside laurel leaves", "beside olive branches", "by candlelight", "in dawn light", "amid sea mist", "amid golden motes", "held in two hands", "displayed alone", "beneath a glass cover", "floating before a dark background"]],
] as const;

export interface TreasureToken {
  position: number;
  tokenHex: string;
  family: string;
  familyZh: string;
  phrase: string;
  phraseZh: string;
}

export interface TreasureMatchNode {
  id: string;
  name: string;
  genomeHex: string;
  featureHex?: string;
}

export interface TreasureMatchSummary {
  id: string;
  name: string;
  score: number;
  featureHex: string;
}

export interface TreasureSearchAttempt {
  attempt: number;
  hashHex: string;
  closest: TreasureMatchSummary | null;
  matches: TreasureMatchSummary[];
}

export interface TreasureSearchResult {
  timestampMs: string;
  matchThreshold: number;
  attempts: TreasureSearchAttempt[];
  success: boolean;
  finalHashHex: string;
  matches: TreasureMatchSummary[];
}

function hash128(value: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(value)).slice(0, 16));
}

export function createExistenceFeature(genomeHex: string): string {
  if (!/^[0-9a-f]{128}$/.test(genomeHex)) throw new Error("Expected a 512-bit lowercase genome");
  return Array.from({ length: 32 }, (_, index) => genomeHex[index * 4]).join("");
}

export function intersectionScore(searchHashHex: string, featureHex: string): number {
  const left = hexToBytes(searchHashHex, 16);
  const right = hexToBytes(featureHex, 16);
  let score = 0;
  for (let index = 0; index < 16; index += 1) {
    let value = left[index] & right[index];
    while (value) { score += value & 1; value >>>= 1; }
  }
  return score;
}

export function xnorSimilarityScore(searchHashHex: string, featureHex: string): number {
  const left = hexToBytes(searchHashHex, 16);
  const right = hexToBytes(featureHex, 16);
  let differentBits = 0;
  for (let index = 0; index < 16; index += 1) {
    let value = left[index] ^ right[index];
    while (value) { differentBits += value & 1; value >>>= 1; }
  }
  return 128 - differentBits;
}

const XNOR_SCORE_PROBABILITIES = (() => {
  const probabilities = Array<number>(129).fill(0);
  probabilities[0] = 2 ** -128;
  for (let score = 0; score < 128; score += 1)
    probabilities[score + 1] = probabilities[score] * (128 - score) / (score + 1);
  return probabilities;
})();

const XNOR_PROBABILITY_ABOVE = (() => {
  const tails = Array<number>(129).fill(0);
  let tail = 0;
  for (let threshold = 128; threshold >= 0; threshold -= 1) {
    tails[threshold] = tail;
    tail += XNOR_SCORE_PROBABILITIES[threshold];
  }
  return tails;
})();

export function treasureMatchThreshold(nodeCount: number): number {
  if (!Number.isInteger(nodeCount) || nodeCount < 0) throw new RangeError("Existence count must be a non-negative integer");
  if (nodeCount === 0) return 128;
  let bestThreshold = 0;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let threshold = 0; threshold <= 128; threshold += 1) {
    const perComparison = XNOR_PROBABILITY_ABOVE[threshold];
    const completeSearchSuccess = 1 - (1 - perComparison) ** (nodeCount * TREASURE_MAX_ATTEMPTS);
    const difference = Math.abs(completeSearchSuccess - TREASURE_TARGET_SEARCH_SUCCESS);
    if (difference < smallestDifference) {
      bestThreshold = threshold;
      smallestDifference = difference;
    }
  }
  return bestThreshold;
}

export function searchTreasures(spell: string, timestampMs: string | number | bigint, nodes: TreasureMatchNode[]): TreasureSearchResult {
  const timestamp = String(timestampMs);
  const matchThreshold = treasureMatchThreshold(nodes.length);
  let hashHex = hash128(`${spell}｜${timestamp}`);
  const attempts: TreasureSearchAttempt[] = [];
  for (let attempt = 1; attempt <= TREASURE_MAX_ATTEMPTS; attempt += 1) {
    const ranked = nodes.map((node) => {
      const featureHex = node.featureHex ?? createExistenceFeature(node.genomeHex);
      return { id: node.id, name: node.name, featureHex, score: xnorSimilarityScore(hashHex, featureHex) };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const matches = ranked.filter((item) => item.score > matchThreshold);
    attempts.push({ attempt, hashHex, closest: ranked[0] ?? null, matches });
    if (matches.length) return { timestampMs: timestamp, matchThreshold, attempts, success: true, finalHashHex: hashHex, matches };
    if (attempt < TREASURE_MAX_ATTEMPTS) hashHex = hash128(`${hashHex}｜${timestamp}`);
  }
  return { timestampMs: timestamp, matchThreshold, attempts, success: false, finalHashHex: hashHex, matches: [] };
}

export function decodeTreasure(hashHex: string): { subjectIndex: number; subjectName: string; subjectNameEn: string; subjectGroup: string; subjectGroupEn: string; tokens: TreasureToken[] } {
  const bytes = hexToBytes(hashHex, 16);
  const subjectIndex = bytes[0];
  const group = TREASURE_SUBJECT_GROUPS[Math.floor(subjectIndex / 32)];
  const tokens = descriptorFamilies.map(([family, familyZh, zhValues, enValues], index) => {
    const byte = bytes[index + 1];
    const modifierIndex = byte >>> 4;
    const valueIndex = byte & 0x0f;
    return {
      position: index + 1,
      tokenHex: byte.toString(16).padStart(2, "0"),
      family,
      familyZh,
      phraseZh: `${intensityZh[modifierIndex]}${zhValues[valueIndex]}`,
      phrase: `${intensityEn[modifierIndex]} ${enValues[valueIndex]}`,
    };
  });
  return {
    subjectIndex,
    subjectName: TREASURE_SUBJECTS[subjectIndex],
    subjectNameEn: TREASURE_SUBJECTS_EN[subjectIndex],
    subjectGroup: group.name,
    subjectGroupEn: TREASURE_SUBJECT_GROUPS_EN[Math.floor(subjectIndex / 32)].name,
    tokens,
  };
}

export function buildTreasureImagePrompt(subjectNameEn: string, tokens: TreasureToken[]): string {
  return `Generate a single collectible mythic treasure artifact: “${subjectNameEn}”.\n\nUnified visual style:\n${EROS_VISUAL_STYLE}\nA mysterious treasure with a mythic aura, presented in a painterly style with a sense of history.\n\nTreasure subject:\n- ${subjectNameEn}, clearly recognizable as the central artifact\n\nPossible attributes of the treasure subject. If an attribute conflicts with the subject, prioritize the subject's normal characteristics:\n${tokens.map((token) => `- ${token.family}: ${token.phrase}`).join("\n")}\n\nShow only one coherent treasure as the unmistakable focus. Use an uncluttered museum-like composition and preserve compatible attributes as tasteful properties of the artifact. Do not depict any owner or bearer as a character. Do not add text, captions, labels, logos, signatures, or watermarks.`;
}

export function createTreasureName(ownerName: string, subjectName: string): string {
  return `${ownerName} 的 ${subjectName}`;
}

export function addTreasureInstanceNumber(baseName: string, instanceNumber: number): string {
  if (!Number.isInteger(instanceNumber) || instanceNumber < 1) throw new RangeError("Treasure instance number must be a positive integer");
  return instanceNumber === 1 ? baseName : `${baseName}（${instanceNumber}）`;
}
