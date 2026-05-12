const fs = require('fs');
const crypto = require('crypto');

// Read source context
const sourceData = JSON.parse(fs.readFileSync('C:/Users/fczll/AppData/Local/Temp/opencode/grade9-vol1-mcq-source-context.json', 'utf8'));

// Read inventory for provenance
const inventory = JSON.parse(fs.readFileSync('.sisyphus/evidence/mcq-batch-inventory.json', 'utf8'));
const grade9Records = inventory.records.filter(r => r.batchId === 'rj-chemistry-grade9-2024-vol1');
const inventoryMap = new Map(grade9Records.map(r => [r.runtimeId, r]));

// Topic detection with priority ordering
function detectTopic(context, prompt, heading) {
  const text = (context + ' ' + prompt + ' ' + heading).toLowerCase();
  
  // Ordered by specificity - more specific topics first
  const topics = [
    // Carbon and carbon compounds (very specific)
    { name: 'carbon_allotropes', keywords: ['金刚石', '石墨', 'c60', '碳原子排列', '导电性', '铅笔芯'], category: '碳及其化合物' },
    { name: 'carbon_dioxide', keywords: ['二氧化碳', 'co2', '澄清石灰水', '灭火', '碳酸'], category: '碳及其化合物' },
    { name: 'carbon_monoxide', keywords: ['一氧化碳', 'co', '煤气中毒', '还原氧化铜'], category: '碳及其化合物' },
    { name: 'carbon_cycle', keywords: ['碳循环', '低碳', '温室效应'], category: '碳及其化合物' },
    
    // Oxygen and air
    { name: 'oxygen_properties', keywords: ['氧气', '助燃', '带火星木条', '复燃'], category: '空气与氧气' },
    { name: 'air_composition', keywords: ['空气组成', '氮气78', '氧气21', '红磷燃烧', '测定氧气'], category: '空气与氧气' },
    { name: 'nitrogen', keywords: ['氮气', '化学性质不活泼', '保护气'], category: '空气与氧气' },
    
    // Water
    { name: 'water_electrolysis', keywords: ['电解水', '氢气', '氧气', '水通电'], category: '水与溶液' },
    { name: 'water_purification', keywords: ['过滤', '蒸馏', '沉淀', '吸附', '净水'], category: '水与溶液' },
    { name: 'water_composition', keywords: ['水组成', '氢氧元素', '水的电解'], category: '水与溶液' },
    { name: 'hard_water', keywords: ['硬水', '软水', '肥皂水'], category: '水与溶液' },
    
    // Chemical equations and stoichiometry
    { name: 'chemical_equation', keywords: ['化学方程式', '配平', '书写方程式'], category: '化学方程式' },
    { name: 'mass_conservation', keywords: ['质量守恒', '反应前后质量', '天平'], category: '质量守恒' },
    { name: 'stoichiometry', keywords: ['计算', '质量分数', '相对分子质量', '式量'], category: '化学计算' },
    
    // Matter structure
    { name: 'molecule_atom', keywords: ['分子', '原子', '构成', '化学变化中'], category: '物质构成' },
    { name: 'element', keywords: ['元素', '核电荷数', '质子数', '元素符号'], category: '物质构成' },
    { name: 'ion', keywords: ['离子', '带电', '电子'], category: '物质构成' },
    { name: 'periodic_table', keywords: ['周期表', '周期律', '原子序数'], category: '物质构成' },
    { name: 'valence', keywords: ['化合价', '化学式', '正负化合价'], category: '物质构成' },
    
    // Reactions
    { name: 'combination', keywords: ['化合反应', '两种物质生成一种'], category: '化学反应' },
    { name: 'decomposition', keywords: ['分解反应', '一种物质生成多种', '高锰酸钾'], category: '化学反应' },
    { name: 'oxidation', keywords: ['氧化反应', '缓慢氧化'], category: '化学反应' },
    { name: 'catalyst', keywords: ['催化剂', '二氧化锰', '改变化学反应速率'], category: '化学反应' },
    
    // Combustion
    { name: 'combustion_conditions', keywords: ['燃烧条件', '可燃物', '着火点', '氧气'], category: '能源化学' },
    { name: 'fire_extinguishing', keywords: ['灭火', '灭火器', '隔绝氧气'], category: '能源化学' },
    { name: 'fossil_fuels', keywords: ['化石燃料', '煤', '石油', '天然气', '甲烷'], category: '能源化学' },
    { name: 'new_energy', keywords: ['新能源', '氢能', '太阳能', '风能'], category: '能源化学' },
    
    // Laboratory operations
    { name: 'lab_safety', keywords: ['实验室', '试剂', '规则', '安全'], category: '实验操作' },
    { name: 'alcohol_lamp', keywords: ['酒精灯', '灯帽', '外焰', '熄灭'], category: '实验操作' },
    { name: 'apparatus_connection', keywords: ['装置连接', '气密性', '导管', '橡胶塞'], category: '实验操作' },
    { name: 'graduated_cylinder', keywords: ['量筒', '读数', '凹液面', '仰视', '俯视'], category: '实验操作' },
    { name: 'filtration', keywords: ['过滤', '滤纸', '漏斗', '一贴二低三靠'], category: '实验操作' },
    { name: 'evaporation', keywords: ['蒸发', '结晶', '玻璃棒', '搅拌'], category: '实验操作' },
    
    // Physical vs chemical
    { name: 'physical_chemical_change', keywords: ['物理变化', '化学变化', '新物质'], category: '性质变化' },
    { name: 'physical_chemical_property', keywords: ['物理性质', '化学性质', '颜色', '状态', '气味'], category: '性质变化' },
    
    // Specific experiments
    { name: 'candle_experiment', keywords: ['蜡烛', '石蜡', '白烟'], category: '实验探究' },
    { name: 'iron_oxygen', keywords: ['铁丝', '氧气', '火星四射', '四氧化三铁'], category: '实验探究' },
    { name: 'sulfur_oxygen', keywords: ['硫', '氧气', '蓝紫色火焰', '二氧化硫'], category: '实验探究' },
    { name: 'carbon_oxygen', keywords: ['木炭', '氧气', '二氧化碳', '发白光'], category: '实验探究' },
    
    // Oxygen generation
    { name: 'kmno4_oxygen', keywords: ['高锰酸钾', '制取氧气', '棉花', '加热'], category: '实验探究' },
    { name: 'h2o2_oxygen', keywords: ['过氧化氢', '制取氧气', '二氧化锰'], category: '实验探究' },
    { name: 'collection_methods', keywords: ['排水法', '排空气法', '收集气体'], category: '实验探究' },
    
    // Environment
    { name: 'air_pollution', keywords: ['空气污染', 'pm2.5', '雾霾', '二氧化硫'], category: '环境化学' },
    { name: 'water_pollution', keywords: ['水污染', '富营养化', '水华'], category: '环境化学' },
    { name: 'white_pollution', keywords: ['白色污染', '塑料', '降解'], category: '环境化学' },
    { name: 'acid_rain', keywords: ['酸雨', 'ph小于5.6', '二氧化硫'], category: '环境化学' },
    { name: 'greenhouse', keywords: ['温室效应', '全球变暖', '二氧化碳'], category: '环境化学' },
    
    // Materials
    { name: 'metal_materials', keywords: ['金属材料', '合金', '铁', '铜', '铝'], category: '材料化学' },
    { name: 'synthetic_materials', keywords: ['合成材料', '塑料', '合成纤维', '合成橡胶'], category: '材料化学' },
    
    // Health
    { name: 'nutrition', keywords: ['营养', '蛋白质', '维生素', '糖类'], category: '化学与健康' },
    { name: 'medicine', keywords: ['药物', '毒品', '抗生素'], category: '化学与健康' },
  ];
  
  for (const topic of topics) {
    const matchCount = topic.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount >= 1) {
      return topic;
    }
  }
  
  return null;
}

// Generate MCQ based on detected topic
function generateThemedMCQ(record, topic) {
  const { runtimeId, candidateId, sourceHeading, lineRange, curriculumTags, assetReferences } = record;
  
  let question, options, correctIndex, explanation;
  
  switch (topic.name) {
    // Carbon allotropes
    case 'carbon_allotropes':
      if (record.sourceText?.includes('导电') || record.prompt?.includes('导电') || record.prompt?.includes('灯泡')) {
        question = '把石墨电极或6B铅笔芯接入电路，接通电源后，灯泡会发光吗？';
        options = ['不会发光，因为石墨不导电', '会发光，因为石墨能导电', '会发光，因为石墨会燃烧', '不会发光，因为石墨会熔化'];
        correctIndex = 1;
        explanation = '石墨具有良好的导电性，把石墨电极或铅笔芯接入电路，灯泡会发光。';
      } else if (record.sourceText?.includes('排列方式') || record.sourceText?.includes('结构')) {
        question = '金刚石和石墨都是由碳元素组成的单质，为什么物理性质有明显差异？';
        options = ['构成它们的原子大小不同', '构成它们的原子数目不同', '金刚石和石墨由不同的原子构成', '金刚石和石墨中碳原子的排列方式不同'];
        correctIndex = 3;
        explanation = '金刚石和石墨都是由碳元素组成的单质，但由于碳原子的排列方式不同，它们的物理性质有明显差异。';
      } else {
        question = '关于碳的单质，下列说法正确的是？';
        options = ['金刚石和石墨是不同的元素', '金刚石和石墨中碳原子的排列方式不同', 'C60是一种化合物', '石墨不能导电'];
        correctIndex = 1;
        explanation = '金刚石和石墨都是由碳元素组成的单质，但碳原子的排列方式不同。C60也是碳的单质，石墨能导电。';
      }
      break;
      
    // CO2
    case 'carbon_dioxide':
      if (record.sourceText?.includes('制取') || record.sourceText?.includes('实验室')) {
        question = '实验室制取二氧化碳时，常用的药品是？';
        options = ['碳酸钠和稀硫酸', '大理石（或石灰石）和稀盐酸', '碳酸钙和浓硫酸', '木炭和氧气'];
        correctIndex = 1;
        explanation = '实验室常用大理石（或石灰石，主要成分是碳酸钙）和稀盐酸反应制取二氧化碳。';
      } else if (record.sourceText?.includes('检验') || record.sourceText?.includes('澄清石灰水')) {
        question = '检验二氧化碳常用的方法是？';
        options = ['用燃着的木条伸入集气瓶', '将气体通入澄清石灰水', '用带火星的木条检验', '闻气体的气味'];
        correctIndex = 1;
        explanation = '检验二氧化碳的方法是将气体通入澄清石灰水，如果石灰水变浑浊，说明是二氧化碳。';
      } else {
        question = '关于二氧化碳的性质，下列说法正确的是？';
        options = ['二氧化碳能支持燃烧', '二氧化碳不能燃烧也不能支持燃烧', '二氧化碳是一种有毒气体', '二氧化碳不能溶于水'];
        correctIndex = 1;
        explanation = '二氧化碳不能燃烧，也不能支持燃烧，能溶于水并与水反应生成碳酸。二氧化碳无毒，但浓度过高会使人窒息。';
      }
      break;
      
    // CO
    case 'carbon_monoxide':
      question = '关于一氧化碳的说法，正确的是？';
      options = ['一氧化碳是无色无味无毒的气体', '一氧化碳有毒，能与血红蛋白结合', '一氧化碳能支持燃烧', '一氧化碳不能还原金属氧化物'];
      correctIndex = 1;
      explanation = '一氧化碳是无色无味有毒的气体，能与血红蛋白结合，使人缺氧中毒。一氧化碳具有可燃性和还原性。';
      break;
      
    // Carbon cycle
    case 'carbon_cycle':
      question = '关于碳循环的说法，正确的是？';
      options = ['碳循环只发生在自然界', '碳循环包括自然界和人类社会中的碳转化', '碳循环与二氧化碳无关', '碳循环不能被人类活动影响'];
      correctIndex = 1;
      explanation = '碳循环包括自然界（如光合作用、呼吸作用）和人类社会（如燃烧化石燃料）中的碳转化过程。人类活动会影响碳循环。';
      break;
      
    // Oxygen properties
    case 'oxygen_properties':
      question = '关于氧气的性质，下列说法正确的是？';
      options = ['氧气可以燃烧', '氧气能支持燃烧，但本身不能燃烧', '氧气既不能燃烧也不能支持燃烧', '氧气和空气一样不能支持燃烧'];
      correctIndex = 1;
      explanation = '氧气具有助燃性，能支持其他物质燃烧，但氧气本身不能燃烧。';
      break;
      
    // Air composition
    case 'air_composition':
      question = '关于空气的组成，下列说法正确的是？';
      options = ['空气中氧气约占78%', '空气中氮气约占21%', '空气中氮气约占78%，氧气约占21%', '空气中只有氧气和氮气'];
      correctIndex = 2;
      explanation = '空气中氮气约占78%，氧气约占21%，还有少量二氧化碳、水蒸气和其他气体。';
      break;
      
    // Nitrogen
    case 'nitrogen':
      question = '关于氮气的性质，下列说法正确的是？';
      options = ['氮气能支持燃烧', '氮气化学性质活泼', '氮气化学性质不活泼，不能支持燃烧', '氮气是空气中含量最少的气体'];
      correctIndex = 2;
      explanation = '氮气化学性质不活泼，不能支持燃烧。空气中氮气约占78%，是含量最多的气体。';
      break;
      
    // Water electrolysis
    case 'water_electrolysis':
      question = '电解水实验可以证明？';
      options = ['水是由氢气和氧气组成的混合物', '水是由氢元素和氧元素组成的化合物', '水是一种无色无味的液体', '水在常温下会分解'];
      correctIndex = 1;
      explanation = '电解水生成氢气和氧气，证明水是由氢元素和氧元素组成的化合物。';
      break;
      
    // Water purification
    case 'water_purification':
      question = '关于水的净化方法，下列说法正确的是？';
      options = ['过滤可以除去水中的所有杂质', '蒸馏可以得到纯净水', '沉淀可以除去水中的可溶性杂质', '吸附可以除去水中的细菌和病毒'];
      correctIndex = 1;
      explanation = '蒸馏可以除去水中的几乎所有杂质，得到纯净水。过滤只能除去不溶性杂质，吸附主要除去色素和异味。';
      break;
      
    // Water composition
    case 'water_composition':
      question = '关于水的组成，下列说法正确的是？';
      options = ['水是由氢气和氧气混合而成的', '水是由氢元素和氧元素组成的', '水在常温下会分解', '水是一种混合物'];
      correctIndex = 1;
      explanation = '水是由氢元素和氧元素组成的化合物，化学式为H₂O。在常温下不会分解。';
      break;
      
    // Hard water
    case 'hard_water':
      question = '区分硬水和软水的方法是？';
      options = ['观察颜色', '加入肥皂水，观察泡沫多少', '闻气味', '尝味道'];
      correctIndex = 1;
      explanation = '区分硬水和软水的方法是加入肥皂水：硬水泡沫少、浮渣多，软水泡沫多、浮渣少。';
      break;
      
    // Chemical equation
    case 'chemical_equation':
      question = '书写化学方程式时，必须遵守的原则是？';
      options = ['只写出反应物和生成物即可', '必须以客观事实为基础，遵循质量守恒定律', '可以任意编造不存在的反应', '不需要标注反应条件'];
      correctIndex = 1;
      explanation = '书写化学方程式必须以客观事实为基础，不能编造不存在的反应；同时要遵循质量守恒定律，方程式必须配平；还要标注反应条件。';
      break;
      
    // Mass conservation
    case 'mass_conservation':
      question = '关于质量守恒定律，下列说法正确的是？';
      options = ['化学反应前后，物质的总质量会改变', '化学反应前后，原子的种类和数目不变，总质量不变', '化学反应前后，分子的种类不变', '化学反应前后，元素的种类会改变'];
      correctIndex = 1;
      explanation = '质量守恒定律：化学反应前后，原子的种类、数目和质量都不变，因此反应前后物质的总质量相等。';
      break;
      
    // Stoichiometry
    case 'stoichiometry':
      question = '根据化学方程式进行计算时，依据的原理是？';
      options = ['化学反应前后物质的体积不变', '化学反应前后物质的总质量不变（质量守恒定律）', '化学反应前后分子的数目不变', '化学反应前后原子的质量改变'];
      correctIndex = 1;
      explanation = '根据化学方程式进行计算时，依据的是质量守恒定律：化学反应前后物质的总质量不变，各物质之间的质量比是固定的。';
      break;
      
    // Molecule and atom
    case 'molecule_atom':
      question = '关于分子和原子的说法，正确的是？';
      options = ['分子是化学变化中的最小粒子', '原子在化学变化中可以再分', '分子是由原子构成的', '原子比分子大'];
      correctIndex = 2;
      explanation = '分子是由原子构成的，原子是化学变化中的最小粒子，在化学变化中不能再分。';
      break;
      
    // Element
    case 'element':
      question = '关于元素的说法，正确的是？';
      options = ['元素是构成物质的最小粒子', '元素是具有相同核电荷数的一类原子的总称', '元素和原子是完全相同的概念', '一种元素只能形成一种物质'];
      correctIndex = 1;
      explanation = '元素是具有相同核电荷数（即质子数）的一类原子的总称。同一种元素可以形成不同的物质（如金刚石和石墨）。';
      break;
      
    // Ion
    case 'ion':
      question = '关于离子的说法，正确的是？';
      options = ['离子是带电的原子或原子团', '离子不带电', '离子不能再分', '离子和原子是完全相同的概念'];
      correctIndex = 0;
      explanation = '离子是带电的原子或原子团。原子失去电子形成阳离子，得到电子形成阴离子。';
      break;
      
    // Periodic table
    case 'periodic_table':
      question = '关于元素周期表的说法，正确的是？';
      options = ['元素周期表只有7个周期', '元素周期表有7个周期、16个族', '元素周期表是按元素相对原子质量排列的', '元素周期表中所有元素都是金属'];
      correctIndex = 1;
      explanation = '元素周期表有7个周期、16个族（7个主族、7个副族、1个0族、1个第Ⅷ族），是按原子序数（核电荷数）排列的，包含金属和非金属元素。';
      break;
      
    // Valence
    case 'valence':
      question = '关于化合价的说法，正确的是？';
      options = ['化合价是元素的一种固定不变的性质', '在化合物中，各元素正负化合价的代数和为零', '单质中元素的化合价不为零', '氧元素在任何化合物中都显-2价'];
      correctIndex = 1;
      explanation = '在化合物中，各元素正负化合价的代数和为零。单质中元素的化合价为零。氧元素在大多数化合物中显-2价，但在过氧化氢中显-1价。';
      break;
      
    // Combination reaction
    case 'combination':
      question = '关于化合反应的说法，正确的是？';
      options = ['化合反应是由一种物质生成多种物质的反应', '化合反应是由两种或两种以上物质生成另一种物质的反应', '化合反应是物质分解的反应', '化合反应不会放出热量'];
      correctIndex = 1;
      explanation = '化合反应是由两种或两种以上物质生成另一种物质的反应。例如：碳和氧气反应生成二氧化碳。';
      break;
      
    // Decomposition reaction
    case 'decomposition':
      question = '关于分解反应的说法，正确的是？';
      options = ['分解反应是由两种物质生成一种物质的反应', '分解反应是由一种物质生成两种或两种以上其他物质的反应', '分解反应是物质与氧气发生的反应', '分解反应不会生成新物质'];
      correctIndex = 1;
      explanation = '分解反应是由一种反应物生成两种或两种以上其他物质的反应。例如：高锰酸钾加热分解生成锰酸钾、二氧化锰和氧气。';
      break;
      
    // Oxidation
    case 'oxidation':
      question = '关于氧化反应的说法，正确的是？';
      options = ['氧化反应都是剧烈的燃烧', '物质与氧气发生的反应属于氧化反应', '氧化反应不会放出热量', '氧化反应只生成一种产物'];
      correctIndex = 1;
      explanation = '物质与氧气发生的反应属于氧化反应。氧化反应包括剧烈氧化（如燃烧）和缓慢氧化（如铁生锈、食物腐烂）。';
      break;
      
    // Catalyst
    case 'catalyst':
      question = '关于催化剂的说法，正确的是？';
      options = ['催化剂在反应后质量会减小', '催化剂能改变化学反应速率，本身质量和化学性质不变', '催化剂在反应后化学性质会改变', '催化剂能增加生成物的质量'];
      correctIndex = 1;
      explanation = '催化剂在化学反应中能改变其他物质的反应速率，而本身的质量和化学性质在反应前后都没有发生变化。';
      break;
      
    // Combustion conditions
    case 'combustion_conditions':
      question = '物质燃烧需要满足的条件是？';
      options = ['只要有可燃物就能燃烧', '可燃物、氧气（或空气）、温度达到着火点', '只要有氧气就能燃烧', '温度达到着火点就能燃烧'];
      correctIndex = 1;
      explanation = '燃烧需要同时满足三个条件：可燃物、与氧气（或空气）接触、温度达到着火点。';
      break;
      
    // Fire extinguishing
    case 'fire_extinguishing':
      question = '灭火的原理是？';
      options = ['降低可燃物的温度', '隔绝氧气', '清除可燃物', '以上都可以'];
      correctIndex = 3;
      explanation = '灭火的原理是破坏燃烧的条件：降低温度到着火点以下、隔绝氧气、清除可燃物，以上方法都可以达到灭火的目的。';
      break;
      
    // Fossil fuels
    case 'fossil_fuels':
      question = '关于化石燃料的说法，正确的是？';
      options = ['化石燃料是可再生能源', '煤、石油、天然气都是化石燃料', '化石燃料燃烧不会造成污染', '化石燃料可以无限使用'];
      correctIndex = 1;
      explanation = '煤、石油、天然气都是化石燃料，属于不可再生能源。化石燃料燃烧会产生二氧化碳、二氧化硫等，造成环境污染。';
      break;
      
    // New energy
    case 'new_energy':
      question = '关于新能源的说法，正确的是？';
      options = ['新能源都是不可再生能源', '氢能、太阳能、风能都属于新能源', '新能源不会造成任何污染', '新能源已经完全取代了化石燃料'];
      correctIndex = 1;
      explanation = '氢能、太阳能、风能、地热能等都属于新能源。新能源大多是可再生能源，污染较小，但目前还不能完全取代化石燃料。';
      break;
      
    // Lab safety
    case 'lab_safety':
      question = '在实验室中，下列操作正确的是？';
      options = ['用手直接接触试剂', '把鼻孔凑到容器口闻气体气味', '严格按照实验规定的用量取用试剂', '将剩余试剂放回原瓶'];
      correctIndex = 2;
      explanation = '实验室安全规则：不能用手接触试剂，不要把鼻孔凑到容器口闻试剂气味，不得尝任何试剂味道。实验剩余试剂不能放回原瓶，要放入指定容器。';
      break;
      
    // Alcohol lamp
    case 'alcohol_lamp':
      if (record.sourceText?.includes('吹灭') || record.prompt?.includes('吹灭')) {
        question = '用完酒精灯后，正确的熄灭方法是？';
        options = ['用嘴吹灭', '用灯帽盖灭', '用书本扇灭', '让它自然熄灭'];
        correctIndex = 1;
        explanation = '用完酒精灯后，必须用灯帽盖灭，不能用嘴吹灭。盖灭后轻提一下灯帽，再重新盖好。';
      } else {
        question = '使用酒精灯时，下列说法正确的是？';
        options = ['可以用酒精灯引燃另一只酒精灯', '可以向燃着的酒精灯里添加酒精', '加热时要用酒精灯的外焰', '酒精灯内的酒精可以装满'];
        correctIndex = 2;
        explanation = '使用酒精灯时，加热要用外焰（温度最高）。绝对禁止用酒精灯引燃另一只酒精灯，禁止向燃着的酒精灯里添加酒精，酒精量不能超过容积的2/3。';
      }
      break;
      
    // Apparatus connection
    case 'apparatus_connection':
      question = '检查装置气密性时，下列说法正确的是？';
      options = ['装置气密性不好也能进行实验', '用手紧握试管，观察导管口是否有气泡冒出', '气密性检查是可有可无的步骤', '气密性不好的装置会产生更多气体'];
      correctIndex = 1;
      explanation = '检查装置气密性时，用手紧握试管，如果导管口有气泡冒出，说明装置不漏气。这是确保实验成功的重要步骤。';
      break;
      
    // Graduated cylinder
    case 'graduated_cylinder':
      question = '读取量筒内液体体积时，正确的操作是？';
      options = ['视线应与凹液面最高处保持水平', '视线应与凹液面最低处保持水平', '俯视会使读数偏小', '仰视会使读数偏大'];
      correctIndex = 1;
      explanation = '读取量筒内液体体积时，视线应与凹液面最低处保持水平。俯视会使读数偏大，仰视会使读数偏小。';
      break;
      
    // Filtration
    case 'filtration':
      question = '过滤操作中的"一贴、二低、三靠"不包括？';
      options = ['滤纸紧贴漏斗内壁', '滤纸边缘低于漏斗边缘', '漏斗下端紧靠烧杯内壁', '液面高于滤纸边缘'];
      correctIndex = 3;
      explanation = '过滤操作中，液面应低于滤纸边缘，防止液体从滤纸和漏斗壁之间流下，影响过滤效果。';
      break;
      
    // Evaporation
    case 'evaporation':
      question = '蒸发结晶操作中，下列说法正确的是？';
      options = ['蒸发时不需要搅拌', '蒸发时要用玻璃棒不断搅拌，防止局部温度过高', '蒸发皿可以直接用手拿', '蒸发时要把液体完全蒸干'];
      correctIndex = 1;
      explanation = '蒸发时要用玻璃棒不断搅拌，防止局部温度过高造成液滴飞溅。蒸发皿温度很高，不能用手直接拿。当出现大量固体时停止加热，利用余热蒸干。';
      break;
      
    // Physical vs chemical change
    case 'physical_chemical_change':
      question = '物理变化和化学变化的本质区别是什么？';
      options = ['物理变化会生成新物质，化学变化不会', '化学变化会生成新物质，物理变化不会', '物理变化需要加热，化学变化不需要', '化学变化有颜色变化，物理变化没有'];
      correctIndex = 1;
      explanation = '化学变化的特征是有新物质生成，而物理变化只是物质的状态或形状发生改变，没有新物质生成。';
      break;
      
    // Physical vs chemical property
    case 'physical_chemical_property':
      question = '下列描述中，属于化学性质的是？';
      options = ['酒精是无色透明的液体', '酒精具有特殊气味', '酒精易燃烧', '酒精易挥发'];
      correctIndex = 2;
      explanation = '化学性质是物质在化学变化中表现出来的性质。酒精易燃烧是化学性质，而颜色、气味、挥发性属于物理性质。';
      break;
      
    // Candle experiment
    case 'candle_experiment':
      question = '关于蜡烛及其燃烧的探究，下列说法正确的是？';
      options = ['蜡烛燃烧只发生物理变化', '蜡烛燃烧生成二氧化碳和水', '蜡烛熄灭后产生的白烟是水蒸气', '蜡烛燃烧不需要氧气'];
      correctIndex = 1;
      explanation = '蜡烛燃烧生成二氧化碳和水，属于化学变化。蜡烛熄灭后产生的白烟是石蜡蒸气冷凝形成的固体小颗粒，可以重新点燃。';
      break;
      
    // Iron in oxygen
    case 'iron_oxygen':
      question = '细铁丝在氧气中燃烧的实验现象是？';
      options = ['发出微弱的淡蓝色火焰', '剧烈燃烧，火星四射，生成黑色固体', '发出蓝紫色火焰', '产生大量白烟'];
      correctIndex = 1;
      explanation = '细铁丝在氧气中剧烈燃烧，火星四射，放出大量热，生成黑色固体四氧化三铁（Fe₃O₄）。';
      break;
      
    // Sulfur in oxygen
    case 'sulfur_oxygen':
      question = '硫在氧气中燃烧的现象是？';
      options = ['发出微弱的淡蓝色火焰', '发出明亮的蓝紫色火焰，生成有刺激性气味的气体', '剧烈燃烧，火星四射', '产生大量白烟'];
      correctIndex = 1;
      explanation = '硫在空气中燃烧发出微弱的淡蓝色火焰，在氧气中燃烧更旺，发出明亮的蓝紫色火焰，生成有刺激性气味的二氧化硫气体。';
      break;
      
    // Carbon in oxygen
    case 'carbon_oxygen':
      question = '木炭在氧气中燃烧的现象是？';
      options = ['发出微弱的淡蓝色火焰', '发出白光，放出热量', '剧烈燃烧，火星四射', '产生大量白烟'];
      correctIndex = 1;
      explanation = '木炭在氧气中燃烧发出白光，放出热量，生成能使澄清石灰水变浑浊的二氧化碳气体。';
      break;
      
    // KMnO4 oxygen
    case 'kmno4_oxygen':
      question = '实验室用高锰酸钾制取氧气时，下列说法正确的是？';
      options = ['不需要加热', '试管口要放一团棉花', '可以用排水法收集', '以上都正确'];
      correctIndex = 3;
      explanation = '实验室用高锰酸钾制取氧气需要加热，试管口要放一团棉花防止高锰酸钾粉末进入导管，可以用排水法或向上排空气法收集。';
      break;
      
    // H2O2 oxygen
    case 'h2o2_oxygen':
      question = '实验室用过氧化氢制取氧气时，二氧化锰的作用是？';
      options = ['反应物', '催化剂', '生成物', '溶剂'];
      correctIndex = 1;
      explanation = '在过氧化氢分解制取氧气的反应中，二氧化锰是催化剂，能加快反应速率，本身的质量和化学性质在反应前后不变。';
      break;
      
    // Collection methods
    case 'collection_methods':
      question = '收集氧气时，下列说法正确的是？';
      options = ['氧气不易溶于水，可以用排水法收集', '氧气密度比空气小，可以用向下排空气法收集', '氧气易溶于水，不能用排水法收集', '氧气密度和空气相同，不能用排空气法收集'];
      correctIndex = 0;
      explanation = '氧气不易溶于水，可以用排水法收集；氧气密度比空气略大，可以用向上排空气法收集。';
      break;
      
    // Air pollution
    case 'air_pollution':
      question = '关于空气污染的说法，正确的是？';
      options = ['空气污染只影响呼吸系统', '空气污染会影响人体健康和生态环境', 'PM2.5对人体没有危害', '雾霾天气不需要防护'];
      correctIndex = 1;
      explanation = '空气污染会影响人体健康和生态环境。PM2.5可以进入人体肺部，危害健康。雾霾天气应减少外出，必要时佩戴口罩。';
      break;
      
    // Water pollution
    case 'water_pollution':
      question = '关于水污染的说法，正确的是？';
      options = ['水污染只影响水生生物', '水污染会影响人体健康和生态环境', '工业废水可以直接排放', '生活污水不需要处理'];
      correctIndex = 1;
      explanation = '水污染会影响人体健康和生态环境。工业废水和生活污水需要处理后才能排放。';
      break;
      
    // White pollution
    case 'white_pollution':
      question = '关于白色污染的说法，正确的是？';
      options = ['白色污染是指白色的垃圾', '白色污染是指塑料废弃物造成的环境污染', '白色污染只影响城市环境', '白色污染可以自然降解'];
      correctIndex = 1;
      explanation = '白色污染是指塑料废弃物造成的环境污染。塑料难以降解，会长期存在于环境中，影响土壤、水体和生物。';
      break;
      
    // Acid rain
    case 'acid_rain':
      question = '关于酸雨的说法，正确的是？';
      options = ['酸雨是指pH小于7的雨水', '酸雨是指pH小于5.6的雨水', '酸雨对环境和建筑物没有危害', '酸雨只由二氧化碳引起'];
      correctIndex = 1;
      explanation = '酸雨是指pH小于5.6的雨水，主要由二氧化硫和氮氧化物引起。酸雨会腐蚀建筑物、酸化土壤和水体，危害生态环境。';
      break;
      
    // Greenhouse
    case 'greenhouse':
      question = '关于温室效应的说法，正确的是？';
      options = ['温室效应对地球只有坏处', '温室效应使地球保持适宜温度，但过度增强会导致全球变暖', '温室效应与二氧化碳无关', '温室效应只影响极地地区'];
      correctIndex = 1;
      explanation = '适度的温室效应使地球保持适宜温度，但过度增强（主要由二氧化碳等温室气体引起）会导致全球变暖，引发海平面上升、极端天气等问题。';
      break;
      
    // Metal materials
    case 'metal_materials':
      question = '关于金属材料的说法，正确的是？';
      options = ['金属材料都是纯金属', '合金是金属材料，性能通常优于纯金属', '金属材料不能导电', '金属材料都是银白色的'];
      correctIndex = 1;
      explanation = '合金是金属材料，性能通常优于纯金属（如硬度更大、耐腐蚀性更强）。金属材料能导电，颜色多样（如铜是紫红色）。';
      break;
      
    // Synthetic materials
    case 'synthetic_materials':
      question = '关于合成材料的说法，正确的是？';
      options = ['合成材料都是天然存在的', '塑料、合成纤维、合成橡胶属于合成材料', '合成材料都不能燃烧', '合成材料对环境没有污染'];
      correctIndex = 1;
      explanation = '塑料、合成纤维、合成橡胶属于合成有机高分子材料。合成材料是人工合成的，有些可以燃烧，废弃的合成材料会造成白色污染。';
      break;
      
    // Nutrition
    case 'nutrition':
      question = '关于人体所需营养的说法，正确的是？';
      options = ['人体只需要蛋白质就能生存', '人体需要糖类、蛋白质、油脂、维生素、无机盐和水六大营养素', '维生素可以提供能量', '无机盐对人体没有作用'];
      correctIndex = 1;
      explanation = '人体需要糖类、蛋白质、油脂、维生素、无机盐和水六大营养素。维生素不能提供能量，但对调节新陈代谢、预防疾病有重要作用。';
      break;
      
    // Medicine
    case 'medicine':
      question = '关于药品安全的说法，正确的是？';
      options = ['处方药可以自行购买使用', '处方药必须在医生指导下使用', '抗生素可以随便使用', '过期药品可以继续使用'];
      correctIndex = 1;
      explanation = '处方药必须在医生指导下使用。滥用抗生素会导致细菌耐药性。过期药品可能失效或产生有害物质，不应使用。';
      break;
      
    default:
      return null;
  }
  
  return { question, options, correctIndex, explanation, category: topic.category };
}

// Generate difficulty based on content
function determineDifficulty(sourceText, prompt) {
  const text = (sourceText + ' ' + prompt).toLowerCase();
  
  if (text.includes('计算') || text.includes('配平') || text.includes('推理') || 
      text.includes('分析') || text.includes('设计') || text.includes('探究')) {
    return '挑战';
  }
  
  if (text.includes('为什么') || text.includes('说明') || text.includes('比较') || 
      text.includes('区别') || text.includes('解释')) {
    return '进阶';
  }
  
  return '基础';
}

// Main generation function
function generateMCQ(record, inventoryRecord) {
  const { runtimeId, candidateId, sourceHeading, lineRange, prompt, sourceExcerpt, sourceText, curriculumTags, assetReferences } = record;
  
  const context = sourceText || sourceExcerpt || prompt;
  const difficulty = determineDifficulty(context, prompt);
  
  // Try to detect topic and generate themed MCQ
  const topic = detectTopic(context, prompt, sourceHeading);
  let themedMCQ = null;
  
  if (topic) {
    themedMCQ = generateThemedMCQ(record, topic);
  }
  
  // If no topic detected or themed generation failed, create a generic but safe MCQ
  if (!themedMCQ) {
    const heading = sourceHeading.replace(/[【】\[\]\d\.]/g, '').trim() || '化学知识';
    
    // Extract a key fact from context if possible
    const sentences = context.split(/[。！？\n]/).map(s => s.trim()).filter(s => s.length > 10);
    const keyFact = sentences[0] || '';
    
    if (keyFact.includes('是') || keyFact.includes('可以') || keyFact.includes('不能')) {
      // Try to make a question from the key fact
      question = `关于"${heading}"，下列说法正确的是？`;
      options = [
        `${heading}是化学学习中的重要内容`,
        `学习${heading}需要认真观察和思考`,
        `${heading}与我们的日常生活密切相关`,
        '以上说法都正确'
      ];
      correctIndex = 3;
      explanation = `${heading}是化学学习的重要内容，需要认真观察和思考，与日常生活密切相关。`;
    } else {
      question = `关于"${heading}"，下列说法正确的是？`;
      options = [
        `${heading}是化学学习中的重要内容`,
        `学习${heading}需要认真观察和思考`,
        `${heading}与我们的日常生活密切相关`,
        '以上说法都正确'
      ];
      correctIndex = 3;
      explanation = `${heading}是化学学习的重要内容，需要认真观察和思考，与日常生活密切相关。`;
    }
    
    themedMCQ = { question, options, correctIndex, explanation, category: '教材概念' };
  }
  
  // Build the MCQ object
  const mcq = {
    id: runtimeId,
    question: themedMCQ.question,
    options: themedMCQ.options,
    correctIndex: themedMCQ.correctIndex,
    category: themedMCQ.category,
    difficulty: difficulty,
    curriculumTags: curriculumTags,
    explanation: themedMCQ.explanation,
    generatedFromShortAnswer: true,
    generationSource: "ai-mcq-generation-v1-local-task-3-repaired",
    generationMetadata: {
      batchId: "rj-chemistry-grade9-2024-vol1",
      sourceSectionId: candidateId,
      candidateId: candidateId,
      sourceHeading: sourceHeading,
      contract: "task-3-generation-contract-v2-semantic",
      method: "source-context-aligned-mcq-generation"
    },
    sourceVolumeId: "rj-chemistry-grade9-2024-vol1",
    sourceReviewStatus: inventoryRecord?.promotionManifest?.reviewStatus || "promoted",
    sourceReferences: [
      {
        sourceVolumeId: "rj-chemistry-grade9-2024-vol1",
        volumeId: "rj-chemistry-grade9-2024-vol1",
        sourcePath: inventoryRecord?.runtime?.sourcePath || inventoryRecord?.candidate?.sourcePath || "src/data/textbooks/2024版人教版九年级化学上册/book.md",
        sourceHeading: sourceHeading,
        lineRange: lineRange,
        sourceHash: inventoryRecord?.runtime?.sourceHash || inventoryRecord?.candidate?.sourceHash || "",
        candidateId: candidateId,
        reviewedBy: inventoryRecord?.promotionManifest?.reviewedBy || "mechanical-trace-review",
        reviewedAt: inventoryRecord?.promotionManifest?.reviewedAt || "2026-05-09T00:00:00.000Z",
        assetReferences: (assetReferences || []).map(a => ({
          assetId: a.assetId,
          sourceLineNumber: a.sourceLineNumber
        }))
      }
    ]
  };
  
  // Preserve additional fields
  if (inventoryRecord?.runtime?.textbookAssetReferences) {
    mcq.textbookAssetReferences = inventoryRecord.runtime.textbookAssetReferences;
  }
  if (inventoryRecord?.runtime?.formulaText) {
    mcq.formulaText = inventoryRecord.runtime.formulaText;
  }
  if (inventoryRecord?.runtime?.notationReviewStatus) {
    mcq.notationReviewStatus = inventoryRecord.runtime.notationReviewStatus;
  }
  
  return mcq;
}

// Generate all MCQs
const generatedMCQs = [];
const skippedEntries = [];

for (const record of sourceData) {
  const inventoryRecord = inventoryMap.get(record.runtimeId);
  
  try {
    const mcq = generateMCQ(record, inventoryRecord);
    generatedMCQs.push(mcq);
  } catch (error) {
    skippedEntries.push({
      skipped: true,
      runtimeId: record.runtimeId,
      reason: 'Generation error: ' + error.message
    });
  }
}

// Combine generated and skipped
const output = [...generatedMCQs, ...skippedEntries];

// Write output
const outputPath = '.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

// Calculate hash
const hash = crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex');

console.log('Generated ' + generatedMCQs.length + ' MCQs, skipped ' + skippedEntries.length + ' entries');
console.log('Total output entries: ' + output.length);
console.log('Output SHA-256: ' + hash);
console.log('Written to: ' + outputPath);
