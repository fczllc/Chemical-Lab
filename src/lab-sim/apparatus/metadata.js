export const APPARATUS_METADATA = Object.freeze({
  'beaker': {
    name: '烧杯',
    nameEn: 'Beaker',
    usage: '用于配制溶液、承接液体和进行温和加热，是实验台上最常见的容器。',
    safetyNotes: ['加热时需垫石棉网或陶土网', '倾倒液体时让杯嘴贴近容器内壁']
  },
  'test-tube': {
    name: '试管',
    nameEn: 'Test Tube',
    usage: '用于少量试剂反应、观察颜色变化或短时间加热样品。',
    safetyNotes: ['加热时管口不要朝向自己或他人', '液体体积不要超过试管容量的三分之一']
  },
  'graduated-cylinder': {
    name: '量筒',
    nameEn: 'Graduated Cylinder',
    usage: '用于较准确量取一定体积的液体，并通过凹液面最低处读数。',
    safetyNotes: ['读数时视线与液面保持水平', '量筒不适合直接加热']
  },
  'dropper': {
    name: '滴管',
    nameEn: 'Dropper',
    usage: '用于少量、多次、可控地转移液体试剂。',
    safetyNotes: ['滴管尖端不要接触其他容器内壁', '不同试剂不要混用同一支滴管']
  },
  'alcohol-burner': {
    name: '酒精灯',
    nameEn: 'Alcohol Burner',
    usage: '用于提供稳定小火焰，对试管、烧杯等器材进行实验加热。',
    safetyNotes: ['点燃后不可向灯内添加酒精', '熄灭时使用灯帽盖灭，不要用嘴吹']
  },
  'thermometer': {
    name: '温度计',
    nameEn: 'Thermometer',
    usage: '用于测量反应体系或水浴的温度变化。',
    safetyNotes: ['测温时球泡完全浸入待测区域', '不要把温度计当搅拌棒使用']
  },
  'iron-stand': {
    name: '铁架台',
    nameEn: 'Iron Stand',
    usage: '用于固定夹持试管、漏斗或导管，帮助搭建稳定的实验装置。',
    safetyNotes: ['夹持前确认底座放平稳', '调节夹子时先托住被夹器材']
  },
  'tubing': {
    name: '导管',
    nameEn: 'Tubing',
    usage: '用于连接装置并引导气体或液体沿指定路径流动。',
    safetyNotes: ['连接前检查是否堵塞或破裂', '弯折处不要过度挤压影响通气']
  },
  'gas-jar': {
    name: '集气瓶',
    nameEn: 'Gas Jar',
    usage: '用于收集、暂存和观察气体样品。',
    safetyNotes: ['收集气体前确认瓶口密合', '未知气体不要直接闻嗅']
  },
  'funnel': {
    name: '漏斗',
    nameEn: 'Funnel',
    usage: '用于转移液体或配合滤纸完成过滤操作。',
    safetyNotes: ['过滤时漏斗颈尖端贴近承接容器内壁', '倒液体不要超过滤纸边缘']
  },
  'glass-rod': {
    name: '玻璃棒',
    nameEn: 'Glass Rod',
    usage: '用于搅拌溶液、引流液体或帮助固体溶解。',
    safetyNotes: ['搅拌时避免碰撞容器壁过猛', '使用后及时清洗，防止交叉污染']
  },
  'safety-shield': {
    name: '安全防护罩',
    nameEn: 'Safety Shield',
    usage: '用于在演示或有飞溅风险的实验中隔离观察区域。',
    safetyNotes: ['实验前确认防护罩位于操作者与反应装置之间', '有裂纹或明显划伤时不要继续使用']
  }
});

export function getApparatusMetadata(apparatusId) {
  return APPARATUS_METADATA[apparatusId] ?? null;
}
