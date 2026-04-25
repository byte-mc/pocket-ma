export type Region = {
  id: string;
  emoji: string;
  label: string;
  labelZh?: string;
  conditions: string[];
  conditionsZh?: string[];
};

export const REGIONS: Region[] = [
  {
    id: 'california',
    emoji: '🌉',
    label: 'California, USA',
    labelZh: '美国加利福尼亚州',
    conditions: [
      'Valley fever (coccidioidomycosis) — soil/dust inhalation, flu-like with chest pain',
      'Lyme disease — tick bite, bullseye rash, joint pain',
      'Western rattlesnake envenomation — fang marks, rapid swelling',
      'Hantavirus — rodent exposure, fever + respiratory distress',
      'Wildfire smoke inhalation — respiratory irritation, headache',
    ],
    conditionsZh: [
      '山谷热（球孢子菌病）— 吸入土壤/粉尘，类流感症状伴胸痛',
      '莱姆病 — 蜱虫叮咬，靶心状皮疹，关节痛',
      '响尾蛇咬伤 — 咬痕，迅速肿胀',
      '汉坦病毒 — 接触鼠类，发热伴呼吸窘迫',
      '野火烟雾吸入 — 呼吸道刺激，头痛',
    ],
  },
  {
    id: 'us_southeast',
    emoji: '🌿',
    label: 'US Southeast',
    labelZh: '美国东南部',
    conditions: [
      'Rocky Mountain spotted fever — tick bite, fever + petechial rash',
      'Ehrlichiosis / Anaplasmosis — tick bite, fever + low white cell count',
      'Copperhead / water moccasin envenomation — fang marks, swelling',
      'Fire ant anaphylaxis — multiple stings, allergic reaction',
      'Vibrio wound infection — seawater exposure, rapidly worsening wound',
    ],
    conditionsZh: [
      '落基山斑疹热 — 蜱虫叮咬，发热伴点状皮疹',
      '埃里希体病/无形体病 — 蜱虫叮咬，发热伴白细胞减少',
      '铜头蛇/棉口蛇咬伤 — 咬痕，肿胀',
      '火蚁过敏反应 — 多处叮咬，过敏反应',
      '弧菌伤口感染 — 海水接触，伤口迅速恶化',
    ],
  },
  {
    id: 'southeast_asia',
    emoji: '🌴',
    label: 'Southeast Asia',
    labelZh: '东南亚',
    conditions: [
      'Dengue fever — mosquito bite, high fever + severe bone pain + rash',
      'Scrub typhus — mite bite, eschar + fever + swollen lymph nodes',
      'Melioidosis — soil/water exposure, pneumonia or skin infection',
      'Leptospirosis — flood/water exposure, jaundice + muscle pain',
      'Malaria — mosquito bite (rural), cyclical fever + chills',
      'Hand, foot and mouth disease — child, oral sores + rash on extremities',
    ],
    conditionsZh: [
      '登革热 — 蚊虫叮咬，高烧伴剧烈骨痛及皮疹',
      '恙虫病 — 螨虫叮咬，焦痂伴发热及淋巴结肿大',
      '类鼻疽 — 接触土壤/水，肺炎或皮肤感染',
      '钩端螺旋体病 — 洪水/水体接触，黄疸伴肌肉痛',
      '疟疾 — 蚊虫叮咬（农村），周期性发热发冷',
      '手足口病 — 儿童，口腔溃疡伴四肢皮疹',
    ],
  },
  {
    id: 'sub_saharan_africa',
    emoji: '🌍',
    label: 'Sub-Saharan Africa',
    labelZh: '撒哈拉以南非洲',
    conditions: [
      'Malaria — mosquito bite, cyclical fever + chills + headache',
      'Typhoid fever — contaminated food/water, sustained fever + abdominal pain',
      'Cholera — contaminated water, profuse watery diarrhea',
      'Schistosomiasis — freshwater exposure, rash then organ involvement',
      'Meningococcal meningitis — meningitis belt, sudden fever + neck stiffness + rash',
      'Rabies — animal bite, wound redness + neurological symptoms',
    ],
    conditionsZh: [
      '疟疾 — 蚊虫叮咬，周期性发热、发冷、头痛',
      '伤寒 — 污染食物/水，持续高烧伴腹痛',
      '霍乱 — 污染水源，大量水样腹泻',
      '血吸虫病 — 接触淡水，皮疹后器官受累',
      '流行性脑脊髓膜炎 — 脑膜炎带，突发高烧、颈项强直及皮疹',
      '狂犬病 — 动物咬伤，伤口发红伴神经症状',
    ],
  },
  {
    id: 'south_asia',
    emoji: '🕌',
    label: 'South Asia',
    labelZh: '南亚',
    conditions: [
      'Dengue fever — mosquito bite, high fever + severe joint pain + rash',
      'Chikungunya — mosquito bite, fever + debilitating joint pain',
      'Typhoid — contaminated food/water, prolonged fever + rose spots',
      'Kala-azar (visceral leishmaniasis) — sandfly bite, prolonged fever + splenomegaly',
      'Japanese encephalitis — rural mosquito, fever + altered consciousness',
      'Leptospirosis — flood exposure, jaundice + renal failure',
    ],
    conditionsZh: [
      '登革热 — 蚊虫叮咬，高烧伴剧烈关节痛及皮疹',
      '基孔肯雅热 — 蚊虫叮咬，发热伴严重关节痛',
      '伤寒 — 污染食物/水，持续发烧伴玫瑰疹',
      '黑热病（内脏利什曼病）— 白蛉叮咬，长期发烧伴脾肿大',
      '日本脑炎 — 农村蚊虫，发热伴意识障碍',
      '钩端螺旋体病 — 洪水接触，黄疸伴肾功能衰竭',
    ],
  },
  {
    id: 'latin_america',
    emoji: '🌎',
    label: 'Latin America',
    labelZh: '拉丁美洲',
    conditions: [
      'Dengue fever — mosquito bite, fever + pain behind eyes + rash',
      'Chikungunya — mosquito bite, fever + symmetric joint pain',
      'Zika virus — mosquito bite, mild fever + rash + conjunctivitis',
      'Chagas disease — triatomine bug bite, swollen eye + cardiac symptoms',
      'Yellow fever — jungle mosquito, fever + jaundice + bleeding',
      'Leishmaniasis — sandfly bite, skin ulcer or visceral involvement',
    ],
    conditionsZh: [
      '登革热 — 蚊虫叮咬，发热伴眼眶后疼痛及皮疹',
      '基孔肯雅热 — 蚊虫叮咬，发热伴对称性关节痛',
      '寨卡病毒 — 蚊虫叮咬，轻微发热伴皮疹及结膜炎',
      '恰加斯病 — 锥蝽叮咬，眼睑肿胀伴心脏症状',
      '黄热病 — 丛林蚊虫，发热伴黄疸及出血',
      '利什曼病 — 白蛉叮咬，皮肤溃疡或内脏受累',
    ],
  },
  {
    id: 'middle_east',
    emoji: '🏜️',
    label: 'Middle East & North Africa',
    labelZh: '中东及北非',
    conditions: [
      'Heat stroke — extreme heat exposure, confusion + hot dry skin',
      'MERS-CoV — camel contact or hospital exposure, severe respiratory illness',
      'Cutaneous leishmaniasis — sandfly bite, painless skin ulcer',
      'Brucellosis — unpasteurized dairy or livestock, undulant fever + joint pain',
      'Scorpion envenomation — sting, local pain ± systemic effects',
      'Dehydration / hyponatremia — heat + exertion, weakness + cramping',
    ],
    conditionsZh: [
      '中暑 — 极端高温，意识混乱伴皮肤灼热干燥',
      '中东呼吸综合征（MERS）— 接触骆驼或医院暴露，严重呼吸道疾病',
      '皮肤利什曼病 — 白蛉叮咬，无痛性皮肤溃疡',
      '布鲁氏菌病 — 未灭菌乳制品或牲畜接触，波状热伴关节痛',
      '蝎子蜇伤 — 局部疼痛伴可能全身反应',
      '脱水/低钠血症 — 高温劳作，虚弱伴抽搐',
    ],
  },
  {
    id: 'southern_china',
    emoji: '🏮',
    label: 'Southeast China',
    labelZh: '中国东南',
    conditions: [
      'Dengue fever — mosquito bite (Guangdong/Fujian peak Aug–Nov), high fever + joint pain + rash',
      'Scrub typhus — mite bite in fields/grassland, eschar + fever + rash',
      'Hand, foot and mouth disease — young children, oral sores + rash on hands/feet',
      'Clonorchiasis (liver fluke) — raw freshwater fish, jaundice + upper abdominal pain',
      'Avian influenza (H5N1/H7N9) — live poultry exposure, fever + severe respiratory illness',
      'Leptospirosis — flood/paddy field exposure, jaundice + muscle pain + renal failure',
    ],
    conditionsZh: [
      '登革热 — 蚊虫叮咬（粤闽地区8–11月高发），高烧伴剧烈关节痛及皮疹',
      '恙虫病 — 接触农田/草丛，焦痂伴发热及皮疹',
      '手足口病 — 幼儿，口腔溃疡伴手足皮疹',
      '华支睾吸虫病（肝吸虫）— 食用生淡水鱼，黄疸伴右上腹痛',
      '禽流感（H5N1/H7N9）— 接触活禽，发热伴严重呼吸道症状',
      '钩端螺旋体病 — 接触洪水/稻田，黄疸伴肌肉痛及肾功能损害',
    ],
  },
  {
    id: 'wilderness',
    emoji: '🏔️',
    label: 'Mountain / Wilderness',
    labelZh: '山地/野外',
    conditions: [
      'Acute mountain sickness (AMS) — rapid ascent >2500m, headache + nausea',
      'High-altitude pulmonary edema (HAPE) — breathlessness at altitude, cough + pink froth',
      'Hypothermia — cold exposure, confusion + shivering cessation',
      'Frostbite — freezing, white/numb extremities',
      'Giardia — untreated water, delayed-onset diarrhea + bloating',
      'Lightning strike — thunderstorm, altered consciousness + burns',
    ],
    conditionsZh: [
      '急性高原病 — 快速升至2500米以上，头痛伴恶心',
      '高原肺水肿 — 高原呼吸困难，咳嗽伴粉红色泡沫痰',
      '低体温症 — 寒冷暴露，意识混乱伴寒战消失',
      '冻伤 — 冻结，肢端发白麻木',
      '贾第鞭毛虫病 — 未处理水，延迟性腹泻伴腹胀',
      '雷击 — 雷雨天气，意识障碍伴烧伤',
    ],
  },
];

export function regionLabel(region: Region, lang: string): string {
  return lang === 'zh' ? (region.labelZh ?? region.label) : region.label;
}

export function regionConditions(region: Region, lang: string): string[] {
  return lang === 'zh' ? (region.conditionsZh ?? region.conditions) : region.conditions;
}

export function getLocationContext(region: Region): string {
  return (
    `Location: ${region.label}. ` +
    `Regional conditions to weight more heavily when symptoms are consistent: ` +
    region.conditions.join('; ') + '.'
  );
}
