/**
 * 食谱数据模拟
 * 实际项目中应该从云数据库获取
 */

const recipes = [
  {
    id: 1,
    name: '虾仁蒸蛋',
    description: '高蛋白低脂，口感嫩滑，营养丰富',
    image: 'https://picsum.photos/400/300?random=1',
    calories: 180,
    protein: 28,
    carbs: 8,
    fat: 5,
    cookingTime: 15,
    difficulty: '简单',
    tags: ['高蛋白', '低脂', '少油', '海鲜'],
    ingredients: [
      { name: '鸡蛋', amount: '3个', calories: 210 },
      { name: '虾仁', amount: '100g', calories: 80 },
      { name: '温水', amount: '150ml', calories: 0 }
    ],
    steps: [
      '鸡蛋打散，加入1.5倍的温水，搅拌均匀',
      '过筛去除气泡，倒入蒸碗',
      '虾仁处理干净，摆放在蛋液上',
      '盖上保鲜膜，冷水上锅蒸12分钟',
      '出锅后淋上少许生抽和香油即可'
    ],
    nutritionHighlight: '蛋白质含量极高，适合增肌减脂人群'
  },
  {
    id: 2,
    name: '鸡胸肉蔬菜沙拉',
    description: '健身餐首选，营养全面',
    image: 'https://picsum.photos/400/300?random=2',
    calories: 320,
    protein: 35,
    carbs: 25,
    fat: 8,
    cookingTime: 20,
    difficulty: '简单',
    tags: ['高蛋白', '低卡', '轻食', '健身'],
    ingredients: [
      { name: '鸡胸肉', amount: '150g', calories: 165 },
      { name: '生菜', amount: '50g', calories: 8 },
      { name: '圣女果', amount: '100g', calories: 22 },
      { name: '玉米粒', amount: '50g', calories: 54 },
      { name: '西兰花', amount: '100g', calories: 34 }
    ],
    steps: [
      '鸡胸肉用黑胡椒、少许盐腌制10分钟',
      '平底锅少油煎熟，切片备用',
      '生菜、圣女果清洗干净',
      '西兰花焯水煮熟',
      '所有食材摆盘，淋上油醋汁'
    ],
    nutritionHighlight: '优质蛋白+膳食纤维，饱腹感强'
  },
  {
    id: 3,
    name: '番茄炒蛋',
    description: '家常经典，营养均衡',
    image: 'https://picsum.photos/400/300?random=3',
    calories: 280,
    protein: 15,
    carbs: 18,
    fat: 16,
    cookingTime: 10,
    difficulty: '简单',
    tags: ['家常', '快手', '营养均衡'],
    ingredients: [
      { name: '鸡蛋', amount: '3个', calories: 210 },
      { name: '番茄', amount: '2个', calories: 40 },
      { name: '食用油', amount: '10ml', calories: 90 }
    ],
    steps: [
      '番茄切块，鸡蛋打散',
      '热锅少油，炒鸡蛋至凝固盛出',
      '番茄下锅炒出汁水',
      '加入鸡蛋翻炒均匀',
      '少许盐调味即可'
    ],
    nutritionHighlight: '番茄红素+优质蛋白，抗氧化'
  },
  {
    id: 4,
    name: '清蒸鲈鱼',
    description: '低脂高蛋白，原汁原味',
    image: 'https://picsum.photos/400/300?random=4',
    calories: 220,
    protein: 32,
    carbs: 5,
    fat: 7,
    cookingTime: 25,
    difficulty: '中等',
    tags: ['高蛋白', '低脂', '少油', '海鲜', '清淡'],
    ingredients: [
      { name: '鲈鱼', amount: '1条(500g)', calories: 206 },
      { name: '姜', amount: '适量', calories: 5 },
      { name: '葱', amount: '适量', calories: 8 }
    ],
    steps: [
      '鲈鱼处理干净，两面划刀',
      '姜片和葱段塞入鱼肚',
      '冷水上锅大火蒸8分钟',
      '关火焖2分钟',
      '倒掉蒸鱼水，淋上蒸鱼豉油和热油'
    ],
    nutritionHighlight: 'Omega-3丰富，保护心血管'
  },
  {
    id: 5,
    name: '麻酱拌菠菜',
    description: '简单快手，补铁补钙',
    image: 'https://picsum.photos/400/300?random=5',
    calories: 160,
    protein: 8,
    carbs: 12,
    fat: 10,
    cookingTime: 8,
    difficulty: '简单',
    tags: ['素食', '少油', '快手', '凉菜'],
    ingredients: [
      { name: '菠菜', amount: '300g', calories: 69 },
      { name: '芝麻酱', amount: '20g', calories: 126 },
      { name: '大蒜', amount: '适量', calories: 5 }
    ],
    steps: [
      '菠菜清洗干净',
      '开水焯烫1分钟捞出',
      '过凉水，挤干水分',
      '芝麻酱加温水调稀',
      '淋在菠菜上，加蒜末拌匀'
    ],
    nutritionHighlight: '富含铁质和膳食纤维'
  },
  {
    id: 6,
    name: '香煎三文鱼',
    description: 'Omega-3之王，营养丰富',
    image: 'https://picsum.photos/400/300?random=6',
    calories: 380,
    protein: 38,
    carbs: 8,
    fat: 22,
    cookingTime: 15,
    difficulty: '中等',
    tags: ['高蛋白', '海鲜', '健身'],
    ingredients: [
      { name: '三文鱼', amount: '200g', calories: 360 },
      { name: '柠檬', amount: '半个', calories: 10 },
      { name: '黑胡椒', amount: '适量', calories: 2 }
    ],
    steps: [
      '三文鱼用厨房纸吸干水分',
      '撒上盐和黑胡椒腌制5分钟',
      '平底锅热锅，鱼皮朝下煎3分钟',
      '翻面再煎2分钟',
      '挤上柠檬汁即可'
    ],
    nutritionHighlight: '富含不饱和脂肪酸，有益大脑健康'
  },
  {
    id: 7,
    name: '牛油果鸡蛋三明治',
    description: '健康早餐，能量满满',
    image: 'https://picsum.photos/400/300?random=7',
    calories: 420,
    protein: 18,
    carbs: 45,
    fat: 18,
    cookingTime: 10,
    difficulty: '简单',
    tags: ['早餐', '快手', '营养均衡'],
    ingredients: [
      { name: '全麦面包', amount: '2片', calories: 140 },
      { name: '牛油果', amount: '半个', calories: 120 },
      { name: '鸡蛋', amount: '1个', calories: 70 },
      { name: '生菜', amount: '适量', calories: 5 }
    ],
    steps: [
      '牛油果捣成泥',
      '鸡蛋煎成溏心蛋',
      '面包稍微烤一下',
      '涂抹牛油果泥',
      '放上鸡蛋和生菜，盖上另一片面包'
    ],
    nutritionHighlight: '优质脂肪+碳水，提供持久能量'
  },
  {
    id: 8,
    name: '清炒西兰花',
    description: '低卡高纤，减脂必备',
    image: 'https://picsum.photos/400/300?random=8',
    calories: 95,
    protein: 6,
    carbs: 12,
    fat: 3,
    cookingTime: 8,
    difficulty: '简单',
    tags: ['素食', '低卡', '少油', '快手'],
    ingredients: [
      { name: '西兰花', amount: '300g', calories: 102 },
      { name: '大蒜', amount: '3瓣', calories: 12 },
      { name: '食用油', amount: '5ml', calories: 45 }
    ],
    steps: [
      '西兰花切小朵，焯水1分钟',
      '蒜切片',
      '热锅少油爆香蒜片',
      '倒入西兰花快速翻炒',
      '加盐调味即可'
    ],
    nutritionHighlight: '富含维生素C和膳食纤维'
  },
  {
    id: 9,
    name: '豆腐虾仁汤',
    description: '清淡鲜美，高蛋白低脂',
    image: 'https://picsum.photos/400/300?random=9',
    calories: 150,
    protein: 22,
    carbs: 8,
    fat: 4,
    cookingTime: 15,
    difficulty: '简单',
    tags: ['高蛋白', '低脂', '少油', '汤品', '海鲜'],
    ingredients: [
      { name: '嫩豆腐', amount: '1盒', calories: 70 },
      { name: '虾仁', amount: '100g', calories: 80 },
      { name: '香菜', amount: '适量', calories: 3 }
    ],
    steps: [
      '豆腐切块',
      '水烧开，放入豆腐煮3分钟',
      '加入虾仁煮至变色',
      '加盐调味',
      '撒上香菜即可'
    ],
    nutritionHighlight: '植物蛋白+动物蛋白双重补充'
  },
  {
    id: 10,
    name: '藜麦鸡肉饭',
    description: '低GI主食，饱腹感强',
    image: 'https://picsum.photos/400/300?random=10',
    calories: 480,
    protein: 32,
    carbs: 58,
    fat: 12,
    cookingTime: 30,
    difficulty: '中等',
    tags: ['健身', '主食', '营养均衡', '低GI'],
    ingredients: [
      { name: '藜麦', amount: '80g', calories: 296 },
      { name: '鸡胸肉', amount: '100g', calories: 110 },
      { name: '胡萝卜', amount: '50g', calories: 20 },
      { name: '玉米粒', amount: '30g', calories: 32 }
    ],
    steps: [
      '藜麦提前浸泡30分钟',
      '鸡胸肉切丁，用生抽腌制',
      '藜麦煮熟备用',
      '鸡肉炒熟，加入蔬菜',
      '倒入藜麦翻炒均匀'
    ],
    nutritionHighlight: '完全蛋白+慢碳水，适合健身人群'
  },
  {
    id: 11,
    name: '酸辣白菜',
    description: '开胃解腻，低卡美味',
    image: 'https://picsum.photos/400/300?random=11',
    calories: 85,
    protein: 3,
    carbs: 14,
    fat: 2,
    cookingTime: 10,
    difficulty: '简单',
    tags: ['素食', '低卡', '少油', '辣味', '快手'],
    ingredients: [
      { name: '白菜', amount: '300g', calories: 51 },
      { name: '干辣椒', amount: '适量', calories: 8 },
      { name: '醋', amount: '适量', calories: 3 }
    ],
    steps: [
      '白菜切块',
      '干辣椒切段',
      '热锅少油爆香辣椒',
      '倒入白菜大火快炒',
      '加醋、盐调味'
    ],
    nutritionHighlight: '富含维生素C，促进消化'
  },
  {
    id: 12,
    name: '蒜蓉西葫芦',
    description: '清爽低卡，夏日首选',
    image: 'https://picsum.photos/400/300?random=12',
    calories: 78,
    protein: 4,
    carbs: 10,
    fat: 3,
    cookingTime: 8,
    difficulty: '简单',
    tags: ['素食', '低卡', '少油', '清淡'],
    ingredients: [
      { name: '西葫芦', amount: '1个', calories: 63 },
      { name: '大蒜', amount: '5瓣', calories: 15 }
    ],
    steps: [
      '西葫芦切片',
      '蒜切末',
      '热锅少油爆香蒜末',
      '倒入西葫芦炒软',
      '加盐即可'
    ],
    nutritionHighlight: '水分充足，热量极低'
  }
];

// 模拟用户的饮食记录数据
const generateMockDietRecords = () => {
  const records = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    records.push({
      date: date.toISOString(),
      calories: 1600 + Math.random() * 400,
      protein: 80 + Math.random() * 30,
      carbs: 180 + Math.random() * 50,
      fat: 45 + Math.random() * 20,
      ingredients: ['鸡蛋', '鸡胸肉', '西兰花', '番茄']
    });
  }
  
  return records;
};

module.exports = {
  recipes,
  generateMockDietRecords
};

