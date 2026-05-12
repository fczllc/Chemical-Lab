import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const batchId = 'rj-chemistry-grade8-54-2024-full';
const generatedPath = '.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json';
const checkPath = '.sisyphus/evidence/task-2-grade8-generated-json-check.txt';
const validationPath = '.sisyphus/evidence/task-2-grade8-generated-json-validation.txt';
const learningsPath = '.sisyphus/notepads/remaining-shortanswer-mcq-conversion/learnings.md';
const placeholderPattern = /待复核|TODO|请补充|待填写|依据来源片段补全标准答案|placeholder|待确认|需人工/i;
const validDifficulties = new Set(['基础', '进阶', '挑战']);

const [inventory, quizPayload, draftInventory] = await Promise.all([
  readJson('.sisyphus/evidence/mcq-batch-inventory.json'),
  readJson('src/data/quizData.json'),
  readJson('src/data/textbookIngestion/generated/rj-chemistry-grade8-54-2024-full/draft-inventory.json')
]);

const sourceSections = new Map(draftInventory.sourceSections.map((section) => [section.sourceSectionId || section.sectionId, section]));
const runtimeById = new Map(quizPayload.quizData.map((record) => [record.id, record]));
const targetRuntime = quizPayload.quizData
  .filter((record) => record.category === 'shortAnswer' && record.sourceVolumeId === batchId)
  .sort((a, b) => a.id.localeCompare(b.id));
const targetIds = new Set(targetRuntime.map((record) => record.id));
const inventoryRecords = inventory.records
  .filter((record) => record.batchId === batchId)
  .sort((a, b) => a.runtimeId.localeCompare(b.runtimeId));

if (inventoryRecords.length !== 157 || targetRuntime.length !== 157) {
  throw new Error(`Expected 157 grade8 records; inventory=${inventoryRecords.length}, runtime=${targetRuntime.length}`);
}

const generated = inventoryRecords.map((record, index) => {
  const original = runtimeById.get(record.runtimeId);
  if (!original || !targetIds.has(record.runtimeId)) {
    throw new Error(`Inventory record is not a grade8 runtime target: ${record.runtimeId}`);
  }

  const sourceSection = sourceSections.get(record.sourceSectionId);
  const sourceText = normalizeWhitespace(sourceSection?.sourceText || record.source.sourceTextPreview || record.candidate.sourceExcerpt || '');
  const heading = record.source.sourceHeading || record.candidate.sourceHeading || '教材内容';
  const concept = chooseConcept({ heading, sourceText, prompt: record.candidate.prompt });
  const category = chooseCategory({ heading, sourceText, summary: concept.summary });
  const difficulty = chooseDifficulty({ sourceText, summary: concept.summary });
  const question = buildQuestion({ heading, concept });
  const options = rotateOptions([concept.summary, ...chooseDistractors(concept.summary, sourceText)], index);
  const correctIndex = options.indexOf(concept.summary);

  const entry = {
    id: original.id,
    question,
    options,
    correctIndex,
    category,
    difficulty,
    curriculumTags: [...original.curriculumTags],
    explanation: `答案是“${concept.summary}”。教材“${heading}”强调${concept.explanation}，所以要依据实验、事实或定量关系来判断，而不是只看表面现象。`,
    generatedFromShortAnswer: true,
    generationSource: 'local-source-context-grade8-task-2',
    generationMetadata: {
      batchId,
      sourceSectionId: record.sourceSectionId,
      candidateId: record.candidateId,
      sourceHeading: heading,
      sourceTextHash: record.source.sourceTextHash,
      contract: 'remaining-shortanswer-mcq-conversion-task-2',
      method: 'local-draft-inventory-source-context-child-friendly-mcq-conversion'
    },
    sourceVolumeId: original.sourceVolumeId,
    sourceReviewStatus: original.sourceReviewStatus,
    sourceReferences: original.sourceReferences
  };

  for (const field of ['relatedElement', 'textbookAssetReferences', 'formulaText', 'notationReviewStatus']) {
    if (Object.hasOwn(original, field)) {
      entry[field] = original[field];
    }
  }

  return entry;
});

await writeFile(generatedPath, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');

const check = buildAccountingReport(generated, targetRuntime);
await writeFile(checkPath, check.text, 'utf8');

const validation = validateGenerated(generated, targetRuntime);
await writeFile(validationPath, validation.text, 'utf8');

if (!check.ok || !validation.ok) {
  throw new Error('Generated grade8 MCQ validation failed; see evidence files');
}

const hash = createHash('sha256').update(JSON.stringify(generated)).digest('hex');
await appendFile(
  learningsPath,
  `\n## ${new Date().toISOString()} - Task 2 grade8 generated MCQ JSON\n` +
    `- Generated ${generated.length} MCQ entries for ${batchId}; skipped=0; SHA-256=${hash}.\n` +
    `- Accounting evidence confirmed all ${targetRuntime.length} runtime shortAnswer IDs are represented once with no outside IDs.\n` +
    `- Validation evidence confirmed converter-facing field rules: 4 unique options, valid correctIndex/difficulty, preserved provenance, no answer fields, and no placeholder strings.\n`,
  'utf8'
);

console.log(`Generated ${generated.length} grade8 MCQs at ${generatedPath}`);
console.log(`SHA-256 ${hash}`);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

function chooseConcept({ heading, sourceText, prompt }) {
  const hay = `${heading} ${prompt} ${sourceText}`;
  const rules = [
    [/化学使世界|什么是化学|中心学科/, '化学研究物质的组成、结构、性质、转化和应用', '化学能从分子层次认识物质，并通过化学变化创造和应用物质'],
    [/走进化学世界|科学探究/, '学习化学要重视实验、证据和严谨求实的态度', '实验和科学探究是认识物质变化的重要方法'],
    [/实验有关的图标|护目镜|洗手|排风/, '实验时要遵守安全图标要求，保护自己和同伴', '护目镜、洗手、用电和排风等提示都服务于实验安全'],
    [/化学变化和物理变化|新物质生成|物理变化/, '判断变化类型的关键是看有没有生成新物质', '物理变化没有生成新物质，化学变化会生成新物质'],
    [/实验现象的观察与描述|客观、全面、准确/, '观察实验要全面细致，并客观描述现象', '颜色、状态、气味等变化都应作为证据记录'],
    [/氧气和二氧化碳的性质|用途都是由它们的性质决定/, '物质的用途常由它的性质决定', '氧气、二氧化碳等物质可用性质区分，用途也来自性质'],
    [/实验室化学试剂取用规则|不得尝|不能用手接触/, '取用试剂不能摸、闻近或品尝，还要按量取用', '试剂取用规则能防止污染、浪费和安全事故'],
    [/瓶塞为什么要倒放|标签的一面要朝向手心|倾倒液体/, '规范倾倒液体能防止污染试剂和腐蚀标签', '倒放瓶塞、标签向手心、瓶口紧挨等动作都有安全和防污染目的'],
    [/量筒|仰视|俯视|凹液面/, '读量筒时视线要与凹液面最低处保持水平', '仰视或俯视都会让读数偏离真实体积'],
    [/气泡冒出说明装置不漏气|检查装置的气密性/, '有气泡冒出说明装置受热后空气能从导管排出且气路连通', '气密性检查利用空气受热膨胀形成气泡来判断装置是否漏气'],
    [/仪器装置的连接|玻璃导管|橡胶塞|乳胶管/, '连接仪器要先润湿、轻轻转动插入，并检查气密性', '正确连接能避免玻璃损坏和实验漏气'],
    [/玻璃仪器的洗涤|不聚成水滴|不成股流下/, '内壁水既不聚滴也不成股流下，说明仪器洗净', '干净玻璃仪器的水膜均匀，才能减少实验误差'],
    [/蜡烛|白烟|石蜡|烛芯/, '探究蜡烛要分点燃前、燃烧时和熄灭后观察', '蜡烛探究体现了关注性质、变化和现象证据'],
    [/空气和氧气|空气的成分|空气组成/, '空气是宝贵资源，可用实验认识其中氧气等成分', '空气中的氧气支持燃烧，氮气等成分也有重要用途'],
    [/拉瓦锡|红磷|空气中氧气的含量/, '红磷燃烧消耗氧气，可帮助测定空气中氧气含量', '该实验借助氧气被消耗后水面变化来认识空气组成'],
    [/氧气的用途|氧气能支持燃烧|带有火星的木条/, '氧气能支持燃烧，可使带火星的木条复燃', '氧气用于呼吸、炼钢和燃烧等，体现其比较活泼的性质'],
    [/氮气|燃烧着的红磷熄灭|不支持燃烧/, '氮气通常不支持燃烧，且不易溶于水', '空气中剩余气体的实验现象能帮助认识氮气性质'],
    [/空气污染|保护人类赖以生存的空气|空气质量/, '保护空气要减少污染物排放并关注空气质量', '空气污染会危害健康和环境，需要治理与个人行动'],
    [/木炭|硫|铁丝|在氧气中燃烧|化合反应/, '许多物质在氧气中燃烧比在空气中更剧烈', '氧气浓度越高，燃烧现象通常越明显'],
    [/铁丝|火星四射|四氧化三铁/, '铁丝在氧气中能剧烈燃烧并生成黑色四氧化三铁', '铁丝燃烧实验说明氧气化学性质比较活泼'],
    [/高锰酸钾|过氧化氢|制取氧气|排水法/, '实验室制氧要选择合适反应、装置和收集方法', '高锰酸钾或过氧化氢分解都可用于制取氧气'],
    [/二氧化锰|催化剂|催化作用/, '二氧化锰能加快过氧化氢分解，反应前后自身性质基本不变', '催化剂改变反应速率，本身质量和化学性质反应前后不变'],
    [/分解反应|由一种反应物生成两种或两种以上/, '分解反应是一种物质生成两种或更多物质的反应', '分解反应和化合反应可用反应物、生成物种类数区分'],
    [/气体不纯|刚开始有气泡|不立即收集/, '刚开始的气泡常混有空气，不能马上收集', '先排出装置内空气有助于得到较纯的氧气'],
    [/物质构成的奥秘|世上万物由什么构成|微观世界/, '物质由分子、原子等微观粒子构成', '用微观粒子观点能解释物质组成、性质和变化'],
    [/品红|扩散|分子运动|浓氨水|酚酞/, '扩散和氨分子使酚酞变色说明分子在不断运动', '看不见的微粒运动能用实验现象间接证明'],
    [/分子之间有间隔|热胀冷缩|压缩储存/, '分子之间有间隔，间隔会随温度和压强改变', '气体可压缩、物体热胀冷缩都能用分子间隔解释'],
    [/分子和原子的变化|原子是否发生了变化|氢气在氯气中燃烧/, '化学变化中分子会变，原子种类和数目通常不变', '反应实质是原子重新组合成新分子'],
    [/模型|构建模型|实物模型|理论模型|符号模型/, '模型能突出主要特征，帮助解释和预测物质变化', '化学模型应以事实为依据，并可随认识深入而改进'],
    [/原子核|质子|中子|核外电子|核电荷数/, '原子由原子核和核外电子构成，质子数决定元素种类', '认识原子结构能解释元素和离子的差别'],
    [/元素周期表|每周期开头|元素排列/, '元素周期表按元素规律排列，可反映金属和非金属等变化趋势', '元素周期表帮助查询元素位置、符号和相对原子质量'],
    [/元素 世上万物|不同种元素|质子数不同|元素是/, '元素是具有相同质子数的一类原子的总称', '不同元素的本质区别是原子核内质子数不同'],
    [/自然界的水|水资源及其利用|保护水资源/, '水资源有限，必须节约用水并防治水体污染', '合理利用和保护水资源关系到生命、生产和环境'],
    [/海水变成人们可利用的淡水|海水淡化/, '海水淡化能把海水中的盐分与水分离，得到可利用淡水', '淡化技术服务于淡水资源利用'],
    [/沉降|过滤|吸附|蒸馏|净化水/, '净水可综合使用沉降、过滤、吸附和蒸馏等方法', '不同净水方法能除去不同类型的杂质'],
    [/过滤操作|滤纸|漏斗|玻璃棒/, '过滤时要让滤纸贴紧漏斗，并用玻璃棒引流', '规范过滤操作能更好分离不溶性杂质'],
    [/水是由哪些元素组成|电解水|水的组成|易燃空气/, '水由氢元素和氧元素组成', '水的生成和分解实验证明水不是一种元素'],
    [/正极|负极|玻璃管内的气体|气体慢慢放出/, '电解水时正极产生氧气，负极产生氢气', '检验两极气体能判断水的元素组成'],
    [/单质|化合物|氧化物|水分别属于哪些物质类别/, '水是由氢、氧两种元素组成的化合物，也是氧化物', '物质可按组成元素种类等标准分类'],
    [/化学式|H_2O|元素符号表示物质的组成/, '化学式能表示物质及其元素组成和原子个数比', '用元素符号和数字可以简明表示物质组成'],
    [/符号 .*2H|H}_{2}|2\s*H|单质化学式/, '元素符号前的数字表示粒子个数，右下角数字表示每个分子的原子个数', '化学符号中数字位置不同，意义也不同'],
    [/化合价|原子个数比|代数和为0/, '化合物中各元素正负化合价代数和为零', '利用化合价可推求化合物中元素原子个数比'],
    [/高锰酸钾|锰酸钾|二氧化锰|溴化钠|氯化钙|氧化铝/, '可依据常见元素化合价判断化学式中原子的个数比', '写化学式时要让正负化合价总和为零'],
    [/相对分子质量|质量分数|元素的质量分数|质量比/, '根据化学式可计算相对分子质量、元素质量比和质量分数', '化学式能从定量角度认识物质组成'],
    [/碘酸钾|天然海盐|食品标签|说明书/, '商品标签中的成分和质量分数可用化学式知识理解', '生活标签常包含物质成分和含量信息'],
    [/化学反应的定量关系|质量守恒定律|反应物和生成物的质量/, '化学反应前后参加反应物质的总质量等于生成物总质量', '质量守恒定律从定量角度描述化学反应'],
    [/橡胶塞和小气球|密闭|称量结果/, '密闭装置能防止气体逸出，使称量更符合质量守恒', '有气体参加或生成时，密闭条件对验证质量守恒很重要'],
    [/原子的种类、数目和质量|微观视角说明/, '质量守恒的微观原因是原子种类、数目和质量不变', '化学反应只是原子重新组合'],
    [/化学方程式|反应物|生成物|配平/, '化学方程式能表示反应事实，并要按质量守恒配平', '方程式同时体现物质转化和定量关系'],
    [/最小公倍数法|配平化学方程式/, '配平化学方程式可用最小公倍数法使两边原子数相等', '配平的依据是质量守恒和原子数守恒'],
    [/根据化学方程式进行简单计算|最多可以生产多少|最少需要多少/, '可根据化学方程式中固定质量比进行简单计算', '定量计算帮助合理利用反应物和产品'],
    [/简易供氧器|供氧器|携带方便|氧气与人体健康/, '设计供氧器要兼顾制氧原理、安全、成本和使用需求', '工程设计需要把化学原理转化为安全可用的装置'],
    [/碳单质的多样性|金刚石|石墨|C_?60/, '同种碳元素可形成金刚石、石墨和C60等不同单质', '碳原子排列方式不同会导致物理性质差异'],
    [/墨|碳单质的化学性质|常温下.*不活泼/, '碳单质在常温下化学性质不活泼', '墨迹能长期保存与碳在常温下不易反应有关'],
    [/碳单质与氧气反应|充分燃烧|不充分/, '碳充分燃烧生成二氧化碳，不充分燃烧可生成一氧化碳', '氧气是否充足会影响碳燃烧产物'],
    [/木炭还原氧化铜|还原氧化铜|澄清石灰水/, '高温下木炭能还原氧化铜，并生成使石灰水变浑浊的二氧化碳', '该实验体现碳的还原性'],
    [/二氧化碳溶于水|塑料瓶|石蕊|碳酸/, '二氧化碳能溶于水，并可与水反应生成碳酸', '塑料瓶变瘪和石蕊变色都能帮助认识二氧化碳性质'],
    [/一氧化碳|煤气|难闻气味|煤气泄漏/, '一氧化碳有毒且不易察觉，煤气加臭便于发现泄漏', '安全用气要及时通风、关闭阀门并远离明火'],
    [/自然界中的碳循环|碳达峰|碳中和|低碳行动/, '低碳行动要减少二氧化碳排放并增加吸收', '碳循环和二氧化碳转化帮助理解碳中和理念'],
    [/实验室.*制取二氧化碳|石灰石|稀盐酸/, '实验室常用石灰石或大理石与稀盐酸反应制取二氧化碳', '选择制取反应要考虑原料、速率、纯度和安全'],
    [/检验生成的气体是二氧化碳|证明.*充满/, '二氧化碳可用澄清石灰水检验，用燃着木条验满', '二氧化碳使澄清石灰水变浑浊且通常不支持燃烧'],
    [/长期盛放澄清石灰水|白色固体|碳酸钙/, '澄清石灰水吸收空气中二氧化碳会生成白色碳酸钙', '二氧化碳与氢氧化钙反应可用于解释白色固体形成'],
    [/燃烧的条件|可燃物|着火点|氧气/, '燃烧需要可燃物、氧气和温度达到着火点', '破坏任一燃烧条件都能阻止燃烧'],
    [/灭火|防火|锅盖盖灭|防火隔离带/, '灭火就是清除可燃物、隔绝氧气或降低温度', '灭火原理来自对燃烧条件的破坏'],
    [/控制变量|自变量|因变量/, '控制变量法能一次只研究一个因素的影响', '多变量问题可拆成多个单变量问题分别研究'],
    [/简易灭火器|碳酸钠|盐酸|蜡烛燃烧/, '简易灭火器可利用反应产生二氧化碳来隔绝氧气灭火', '设计灭火器还要考虑装置和试剂安全'],
    [/进风口|燃气灶|黄色或橙色|充分燃烧/, '燃料充分燃烧需要足够空气和较大的接触面积', '氧气不足会产生黑烟、一氧化碳并降低燃料利用率'],
    [/能量变化|酒精|乙醇|放出大量的热量/, '化学反应常伴随能量变化，燃烧通常放热', '酒精燃烧生成二氧化碳和水并释放热量'],
    [/化石能源|煤、石油和天然气|不可再生/, '化石能源应合理利用，并积极开发清洁新能源', '煤、石油和天然气不可再生，使用还会影响环境'],
    [/甲烷|沼气|点燃甲烷前|检验.*纯度/, '点燃甲烷等可燃性气体前必须先检验纯度', '可燃气体与空气混合达到一定范围遇火可能爆炸'],
    [/酸雨|降低化石能源|环境的影响|尾气/, '降低化石能源影响要减少污染物排放并提高利用效率', '煤和汽车燃料燃烧会产生污染物，需治理和替代'],
    [/家用燃料|合理使用|燃料的变迁/, '家用燃料使用要注意安全、充分燃烧和减少污染', '燃具进气量、燃料形态等会影响燃烧效率']
  ];

  const matched = rules.find(([pattern]) => pattern.test(hay));
  if (matched) {
    return { summary: matched[1], explanation: matched[2] };
  }

  if (/任务|活动目标|展示与交流|调查与研究/.test(hay)) {
    return {
      summary: '跨学科实践要明确任务、收集证据、交流并改进方案',
      explanation: '实践活动强调带着目标调查、设计、展示和反思'
    };
  }

  return {
    summary: '学习这段内容要依据教材证据认识物质及其变化',
    explanation: '教材通过事实、实验或问题引导同学建立化学认识'
  };
}

function chooseCategory({ heading, sourceText, summary }) {
  const hay = `${heading} ${sourceText} ${summary}`;
  if (/安全|护目镜|试剂|灭火|燃烧|供氧器|煤气|甲烷/.test(hay)) return '安全与生活应用';
  if (/实验|观察|探究|过滤|制取|检验|气密性|装置/.test(hay)) return '实验探究';
  if (/计算|质量分数|相对分子质量|化学方程式|配平|化合价/.test(hay)) return '定量与符号应用';
  if (/分类|单质|化合物|氧化物|元素周期表/.test(hay)) return '分类判断';
  if (/资源|环境|低碳|水|化石能源|空气污染/.test(hay)) return '资源环境';
  return '教材概念识别';
}

function chooseDifficulty({ sourceText, summary }) {
  const hay = `${sourceText} ${summary}`;
  if (/质量分数|相对分子质量|化学方程式|配平|化合价|定量|推断|计算|质量比|供氧器|低碳行动/.test(hay)) return '进阶';
  return '基础';
}

function buildQuestion({ heading, concept }) {
  if (/计算|配平|化合价|化学式|质量/.test(concept.summary)) {
    return `学习教材“${heading}”时，哪项方法最符合本段内容？`;
  }
  if (/实验|观察|检验|制取|过滤|气密性/.test(concept.summary)) {
    return `关于教材“${heading}”中的实验或探究，哪种理解最合适？`;
  }
  return `根据教材“${heading}”的内容，下面哪种说法最合适？`;
}

function chooseDistractors(correct, sourceText) {
  const pool = [
    '只要记住现象名称，就不需要分析证据',
    '所有物质变化都只看颜色是否改变',
    '实验操作越快越好，安全规则可以忽略',
    '只凭猜想就能得出可靠结论',
    '化学只研究已经存在的物质，不能创造新物质',
    '物质用途与性质没有关系',
    '化学符号中的数字位置不同但意义完全一样',
    '化学反应前后分子、原子和元素都会全部消失',
    '燃烧只需要可燃物，不受氧气和温度影响',
    '保护资源和环境与化学学习没有联系',
    '化学方程式只写物质名称，不需要体现定量关系',
    '净水时任何方法都能除去所有杂质'
  ];
  const preferred = [];
  if (/实验|装置|试剂|过滤|制取/.test(sourceText)) preferred.push('实验时可以不记录现象，直接写结论');
  if (/化学方程式|质量守恒|化合价|化学式/.test(sourceText)) preferred.push('书写化学符号时不需要遵守客观事实和守恒关系');
  if (/水|空气|能源|碳|环境/.test(sourceText)) preferred.push('自然资源取之不尽，用多少都不会影响环境');
  const selected = [];
  for (const option of [...preferred, ...pool]) {
    if (option !== correct && !selected.includes(option)) {
      selected.push(option);
    }
    if (selected.length === 3) break;
  }
  return selected;
}

function rotateOptions(options, index) {
  const correct = options[0];
  const distractors = options.slice(1);
  const correctIndex = index % 4;
  const result = [];
  let distractorIndex = 0;
  for (let i = 0; i < 4; i += 1) {
    result.push(i === correctIndex ? correct : distractors[distractorIndex++]);
  }
  return result;
}

function buildAccountingReport(entries, targets) {
  const entryIds = entries.map((entry) => entry.skipped ? entry.runtimeId : entry.id);
  const targetIds = new Set(targets.map((target) => target.id));
  const entrySet = new Set(entryIds);
  const duplicateIds = entryIds.filter((id, index) => entryIds.indexOf(id) !== index);
  const missingIds = [...targetIds].filter((id) => !entrySet.has(id)).sort();
  const outsideIds = entryIds.filter((id) => !targetIds.has(id)).sort();
  const generatedCount = entries.filter((entry) => entry.skipped !== true).length;
  const skippedCount = entries.filter((entry) => entry.skipped === true).length;
  const ok = entries.length === 157 && entrySet.size === 157 && missingIds.length === 0 && outsideIds.length === 0 && duplicateIds.length === 0;
  return {
    ok,
    text: [
      'Task 2 Grade8 generated JSON accounting check',
      `batchId=${batchId}`,
      `runtimeTargetShortAnswerIds=${targets.length}`,
      `generatedFileEntries=${entries.length}`,
      `generatedMcqEntries=${generatedCount}`,
      `skippedEntries=${skippedCount}`,
      `uniqueAccountedIds=${entrySet.size}`,
      `missingTargetIds=${missingIds.length}`,
      `outsideIds=${outsideIds.length}`,
      `duplicateAccountedIds=${duplicateIds.length}`,
      `status=${ok ? 'PASS' : 'FAIL'}`,
      missingIds.length ? `missing=${missingIds.join(',')}` : 'missing=none',
      outsideIds.length ? `outside=${outsideIds.join(',')}` : 'outside=none',
      duplicateIds.length ? `duplicates=${duplicateIds.join(',')}` : 'duplicates=none',
      ''
    ].join('\n')
  };
}

function validateGenerated(entries, targets) {
  const errors = [];
  const originals = new Map(targets.map((target) => [target.id, target]));
  const seen = new Set();

  entries.forEach((entry, index) => {
    const label = `entries[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label}: entry must be an object`);
      return;
    }
    if (entry.skipped === true) {
      if (typeof entry.runtimeId !== 'string' || !entry.runtimeId.trim()) errors.push(`${label}: skipped runtimeId required`);
      if (typeof entry.reason !== 'string' || !entry.reason.trim()) errors.push(`${label}: skipped reason required`);
      return;
    }
    const original = originals.get(entry.id);
    if (!original) errors.push(`${label}: id is not a grade8 runtime target`);
    if (seen.has(entry.id)) errors.push(`${label}: duplicate id ${entry.id}`);
    seen.add(entry.id);
    requireText(entry.id, `${label}.id`, errors);
    requireText(entry.question, `${label}.question`, errors);
    requireText(entry.category, `${label}.category`, errors);
    requireText(entry.explanation, `${label}.explanation`, errors);
    if (entry.category === 'shortAnswer') errors.push(`${label}: category must not be shortAnswer`);
    if (!Array.isArray(entry.options) || entry.options.length !== 4) {
      errors.push(`${label}: options must contain exactly 4 items`);
    } else {
      const trimmed = entry.options.map((option) => typeof option === 'string' ? option.trim() : option);
      trimmed.forEach((option, optionIndex) => {
        requireText(option, `${label}.options[${optionIndex}]`, errors);
      });
      if (new Set(trimmed).size !== trimmed.length) errors.push(`${label}: options must be unique`);
    }
    if (!Number.isInteger(entry.correctIndex) || entry.correctIndex < 0 || entry.correctIndex > 3) errors.push(`${label}: correctIndex out of range`);
    if (!validDifficulties.has(entry.difficulty)) errors.push(`${label}: invalid difficulty ${entry.difficulty}`);
    if (!Array.isArray(entry.curriculumTags) || entry.curriculumTags.length === 0) errors.push(`${label}: curriculumTags required`);
    if (original) {
      for (const tag of original.curriculumTags || []) {
        if (!entry.curriculumTags.includes(tag)) errors.push(`${label}: missing original curriculum tag ${tag}`);
      }
      for (const field of ['sourceVolumeId', 'sourceReviewStatus', 'sourceReferences']) {
        if (JSON.stringify(entry[field]) !== JSON.stringify(original[field])) errors.push(`${label}: ${field} provenance mismatch`);
      }
      for (const field of ['textbookAssetReferences', 'formulaText', 'notationReviewStatus']) {
        if (Object.hasOwn(original, field) && JSON.stringify(entry[field]) !== JSON.stringify(original[field])) errors.push(`${label}: ${field} provenance mismatch`);
      }
    }
    if (entry.generatedFromShortAnswer !== true) errors.push(`${label}: generatedFromShortAnswer must be true`);
    if (!((typeof entry.generationSource === 'string' && entry.generationSource.trim()) || (typeof entry.generationModel === 'string' && entry.generationModel.trim()))) errors.push(`${label}: generation source/model required`);
    if ('answer' in entry) errors.push(`${label}: answer field must not be present`);
    if (!Array.isArray(entry.sourceReferences) || entry.sourceReferences.length === 0) errors.push(`${label}: sourceReferences required`);
    validateNoPlaceholder(entry, label, errors);
  });

  const hash = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
  return {
    ok: errors.length === 0,
    text: [
      'Task 2 Grade8 generated JSON field validation',
      `batchId=${batchId}`,
      `entries=${entries.length}`,
      `generated=${entries.filter((entry) => entry.skipped !== true).length}`,
      `skipped=${entries.filter((entry) => entry.skipped === true).length}`,
      `validationErrors=${errors.length}`,
      `contentSha256=${hash}`,
      `status=${errors.length === 0 ? 'PASS' : 'FAIL'}`,
      errors.length ? errors.map((error) => `- ${error}`).join('\n') : 'errors=none',
      ''
    ].join('\n')
  };
}

function requireText(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label}: non-empty string required`);
  }
}

function validateNoPlaceholder(value, label, errors) {
  if (typeof value === 'string') {
    if (placeholderPattern.test(value)) errors.push(`${label}: placeholder text found`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateNoPlaceholder(item, `${label}[${index}]`, errors);
    });
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      validateNoPlaceholder(child, `${label}.${key}`, errors);
    }
  }
}
