import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "../protocol/hex";
import { EROS_VISUAL_STYLE } from "../protocol/prompt";

export const TREASURE_PROTOCOL_VERSION = "eros-treasure-v1";
export const TREASURE_MATCH_THRESHOLD = 40;
export const TREASURE_MAX_ATTEMPTS = 3;

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

const intensityZh = ["含蓄的", "清澈的", "柔和的", "明亮的", "沉静的", "庄严的", "典雅的", "精致的", "古朴的", "华贵的", "神秘的", "神圣的", "恒久的", "梦幻的", "宏伟的", "超凡的"] as const;
const intensityEn = ["subtle", "clear", "gentle", "luminous", "serene", "solemn", "elegant", "refined", "antique", "regal", "mysterious", "sacred", "timeless", "dreamlike", "monumental", "otherworldly"] as const;

const descriptorFamilies = [
  ["material", "材质", ["黄金", "白银", "青铜", "大理石", "水晶", "玉石", "黑曜石", "琥珀", "珍珠母", "珊瑚", "象牙色骨质", "橄榄木", "黑檀木", "精钢", "琉璃", "多种珍材"], ["gold", "silver", "bronze", "marble", "crystal", "jade", "obsidian", "amber", "mother-of-pearl", "coral", "ivory-toned bone", "olive wood", "ebony", "polished steel", "glazed glass", "mixed precious materials"]],
  ["color", "色彩", ["日辉金", "月光银", "深海蓝", "黎明红", "橄榄绿", "帝王紫", "象牙白", "夜幕黑", "琥珀橙", "玫瑰粉", "青铜绿", "天青色", "石榴红", "珍珠灰", "虹彩", "古金色"], ["sunlit gold", "moonlit silver", "deep-sea blue", "dawn red", "olive green", "imperial purple", "ivory white", "night black", "amber orange", "rose pink", "verdigris", "sky blue", "garnet red", "pearl gray", "iridescent", "antique gold"]],
  ["luster", "光泽", ["哑光", "丝绸般微光", "温润反光", "镜面光泽", "烛火光晕", "月辉", "日辉", "星芒", "珍珠光", "金属闪光", "水波反光", "琉璃光", "柔亮边缘", "神圣辉光", "变彩光", "内蕴光芒"], ["matte sheen", "silken glimmer", "soft reflection", "mirror polish", "candlelit halo", "moon glow", "sun glow", "starlike sparkle", "pearly luster", "metallic gleam", "watery reflections", "glassy radiance", "soft rim light", "sacred halo", "color-shifting sheen", "inner radiance"]],
  ["craft", "工艺", ["锤揲", "铸造", "雕刻", "镶嵌", "金丝编结", "银丝编结", "浮雕", "透雕", "细密刻线", "宝石切面", "抛光", "彩绘", "珐琅", "织绣", "榫接", "失蜡铸造"], ["hammered", "cast", "carved", "inlaid", "gold filigree", "silver filigree", "relief work", "openwork carving", "fine engraving", "faceted", "polished", "painted", "enameled", "embroidered", "precision joined", "lost-wax cast"]],
  ["era", "时代", ["创世初期", "远古王朝", "英雄时代", "神庙盛期", "海上诸国", "失落城邦", "先知年代", "青铜纪元", "白银纪元", "黄金纪元", "长夜年代", "复兴年代", "无名世纪", "旧约时代", "末代王朝", "时间之外"], ["the dawn of creation", "an ancient dynasty", "the heroic age", "the high temple era", "the age of sea kingdoms", "a lost city-state", "the age of prophets", "the bronze age", "the silver age", "the golden age", "the long night", "an age of renewal", "an unnamed century", "an age of old covenants", "the last dynasty", "outside time"]],
  ["silhouette", "轮廓", ["圆润", "修长", "对称", "流线", "稳重", "轻盈", "层叠", "螺旋", "翼形", "叶形", "泪滴形", "日轮形", "月牙形", "柱式", "花冠形", "几何化"], ["rounded", "slender", "symmetrical", "streamlined", "grounded", "weightless", "layered", "spiral", "wing-shaped", "leaf-shaped", "teardrop-shaped", "solar-disc-shaped", "crescent-shaped", "columnar", "corolla-shaped", "geometric"]],
  ["ornament", "纹饰", ["月桂叶", "橄榄枝", "葡萄藤", "海浪", "云纹", "日轮", "月相", "星辰", "羽翼", "花瓣", "蛇形线", "狮鬃", "鱼鳞", "雷纹", "回纹", "无纹素面"], ["laurel leaves", "olive branches", "grapevines", "sea waves", "cloud scrolls", "solar discs", "moon phases", "stars", "wings", "petals", "serpentine lines", "lion manes", "scale patterns", "thunder motifs", "meanders", "an unadorned surface"]],
  ["emblem", "图徽", ["飞马", "雄狮", "海豚", "白鹿", "鹰", "天鹅", "公牛", "骏马", "蜜蜂", "蝴蝶", "猫头鹰", "蛇", "太阳", "新月", "世界树", "双生火焰"], ["a pegasus", "a lion", "a dolphin", "a white stag", "an eagle", "a swan", "a bull", "a horse", "a bee", "a butterfly", "an owl", "a serpent", "the sun", "a crescent moon", "the world tree", "twin flames"]],
  ["inscription", "铭文", ["无字", "单行祷文", "环形誓言", "主人姓名", "星象符号", "古代数记", "航海方位", "神庙献词", "胜利颂辞", "悼亡短句", "王室箴言", "预言残句", "工匠印记", "城邦徽记", "神秘字母", "不可解读的诗句"], ["no inscription", "a single-line prayer", "a circular oath", "the owner's name", "astral signs", "ancient numerals", "nautical directions", "a temple dedication", "a victory hymn", "a mourning phrase", "a royal maxim", "a fragment of prophecy", "a maker's mark", "a city emblem", "mystic letters", "an undeciphered verse"]],
  ["condition", "保存状态", ["完好如初", "精心修复", "轻微旧化", "边缘柔和磨损", "带有古雅包浆", "略有褪色", "保存于丝绒中", "受蜡封保护", "经海风洗礼", "经圣油养护", "留有礼仪痕迹", "历经传承", "沉睡已久", "从遗迹中净化", "刚被唤醒", "不受岁月侵蚀"], ["pristine", "carefully restored", "gently aged", "softly worn at the edges", "bearing an antique patina", "slightly faded", "preserved in velvet", "protected by a wax seal", "weathered by sea air", "maintained with sacred oil", "marked by ritual use", "passed through generations", "long dormant", "purified from ruins", "newly awakened", "untouched by age"]],
  ["aura", "气韵", ["宁静", "庄重", "喜悦", "勇敢", "智慧", "慈悲", "忠贞", "自由", "希望", "怀旧", "守护", "荣耀", "和谐", "命运感", "神谕感", "不可言说"], ["serenity", "solemnity", "joy", "courage", "wisdom", "compassion", "devotion", "freedom", "hope", "nostalgia", "protection", "glory", "harmony", "a sense of fate", "an oracular presence", "an ineffable presence"]],
  ["gift", "魔力", ["指引归途", "守护梦境", "照见真心", "平息风浪", "鼓舞勇气", "保存记忆", "唤起灵感", "辨认誓言", "温暖持有者", "回应月光", "回应晨曦", "记录星轨", "传递远方回声", "揭示隐藏道路", "衡量命运", "沉默地守望"], ["guiding the way home", "guarding dreams", "revealing the true heart", "calming storms", "inspiring courage", "preserving memories", "awakening inspiration", "recognizing oaths", "warming its bearer", "answering moonlight", "answering dawn", "recording star paths", "carrying distant echoes", "revealing hidden paths", "weighing fate", "keeping a silent vigil"]],
  ["mechanism", "机关", ["无活动部件", "旋转内环", "隐秘铰链", "平衡摆锤", "微型齿轮", "滑动暗格", "磁力指针", "水银刻度", "星盘转轴", "沙粒计时", "发条鸣音", "光学棱镜", "可拆卸组件", "折叠结构", "自动归位", "无法解释的运转"], ["no moving parts", "rotating inner rings", "hidden hinges", "a balanced pendulum", "miniature gears", "a sliding compartment", "a magnetic needle", "a mercury scale", "an astrolabe axis", "sand timing", "a clockwork chime", "an optical prism", "detachable components", "a folding structure", "self-returning motion", "inexplicable motion"]],
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

export function searchTreasures(spell: string, timestampMs: string | number | bigint, nodes: TreasureMatchNode[]): TreasureSearchResult {
  const timestamp = String(timestampMs);
  let hashHex = hash128(`${spell}｜${timestamp}`);
  const attempts: TreasureSearchAttempt[] = [];
  for (let attempt = 1; attempt <= TREASURE_MAX_ATTEMPTS; attempt += 1) {
    const ranked = nodes.map((node) => {
      const featureHex = node.featureHex ?? createExistenceFeature(node.genomeHex);
      return { id: node.id, name: node.name, featureHex, score: intersectionScore(hashHex, featureHex) };
    }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const matches = ranked.filter((item) => item.score > TREASURE_MATCH_THRESHOLD);
    attempts.push({ attempt, hashHex, closest: ranked[0] ?? null, matches });
    if (matches.length) return { timestampMs: timestamp, attempts, success: true, finalHashHex: hashHex, matches };
    if (attempt < TREASURE_MAX_ATTEMPTS) hashHex = hash128(`${hashHex}｜${timestamp}`);
  }
  return { timestampMs: timestamp, attempts, success: false, finalHashHex: hashHex, matches: [] };
}

export function decodeTreasure(hashHex: string): { subjectIndex: number; subjectName: string; subjectGroup: string; tokens: TreasureToken[] } {
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
  return { subjectIndex, subjectName: TREASURE_SUBJECTS[subjectIndex], subjectGroup: group.name, tokens };
}

export function buildTreasureImagePrompt(subjectName: string, ownerName: string, tokens: TreasureToken[]): string {
  return `Generate a single collectible mythic treasure artifact named “${ownerName} 的 ${subjectName}”.\n\nUnified visual style:\n${EROS_VISUAL_STYLE}\n\nTreasure subject:\n- ${subjectName}, clearly recognizable as the central artifact\n\nDeterministic attributes:\n${tokens.map((token) => `- ${token.family}: ${token.phrase}`).join("\n")}\n\nShow only one coherent treasure as the unmistakable focus. Use an uncluttered museum-like composition and preserve all attributes as tasteful properties of the artifact. Do not depict the owner as a character. Do not add text, captions, labels, logos, signatures, or watermarks.`;
}

export function createTreasureName(ownerName: string, subjectName: string): string {
  return `${ownerName} 的 ${subjectName}`;
}

export function addTreasureInstanceNumber(baseName: string, instanceNumber: number): string {
  if (!Number.isInteger(instanceNumber) || instanceNumber < 1) throw new RangeError("Treasure instance number must be a positive integer");
  return instanceNumber === 1 ? baseName : `${baseName}（${instanceNumber}）`;
}
