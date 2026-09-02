// ====== 类型定义 ======
// 所有数据结构按后续真实接入设计，mock 仅返回模拟数据

export interface User {
  id: string;
  nickname: string;
  account: string;
  avatar?: string;
  joinDate: string;
  isAdmin: boolean;
  analyzeCount: number;
  drawCount: number;
  status: 'active' | 'frozen';
}

export interface AnalyzeResult {
  id: string;
  imageUrl: string;
  createdAt: string;
  costumeStructure: string[];       // 服装构成
  fabricGuess: string[];            // 面料推测
  colorScheme: { name: string; hex: string }[]; // 配色方案
  accessories: string[];            // 配件清单
  materials: string[];              // 辅料明细
  craftDifficulties: string[];      // 工艺难点
  patternTips: string[];            // 打版要点提醒
}

export interface DrawImage {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  createdAt: string;
  mode: 'text2img' | 'img2img';
}

export interface GlobalConfig {
  defaultAnalyzeCount: number;
  defaultDrawCount: number;
}

// ====== Mock 数据 ======
const MOCK_USERS: User[] = [
  {
    id: 'u_001',
    nickname: '星野纱织',
    account: 'hoshino',
    joinDate: '2024-03-15',
    isAdmin: false,
    analyzeCount: 2,
    drawCount: 2,
    status: 'active',
  },
  {
    id: 'u_002',
    nickname: '月光琉璃',
    account: 'tsukiyo',
    joinDate: '2024-02-28',
    isAdmin: false,
    analyzeCount: 5,
    drawCount: 3,
    status: 'active',
  },
  {
    id: 'u_003',
    nickname: '枫红小町',
    account: 'momiji',
    joinDate: '2024-01-10',
    isAdmin: false,
    analyzeCount: 0,
    drawCount: 1,
    status: 'active',
  },
  {
    id: 'u_004',
    nickname: '管理员大人',
    account: 'admin',
    joinDate: '2023-12-01',
    isAdmin: true,
    analyzeCount: 99,
    drawCount: 99,
    status: 'active',
  },
  {
    id: 'u_005',
    nickname: '雪落千寒',
    account: 'yukishiro',
    joinDate: '2024-04-20',
    isAdmin: false,
    analyzeCount: 10,
    drawCount: 8,
    status: 'frozen',
  },
  {
    id: 'u_006',
    nickname: '樱庭时雨',
    account: 'sakuraba',
    joinDate: '2024-05-08',
    isAdmin: false,
    analyzeCount: 3,
    drawCount: 4,
    status: 'active',
  },
];

const MOCK_ANALYZE: AnalyzeResult = {
  id: 'a_001',
  imageUrl: '',
  createdAt: '2024-06-01',
  costumeStructure: [
    '上衣：立领交叉短款和服式外套，七分袖',
    '内搭：白色收腰修身衬裙，蕾丝领口',
    '下装：百褶及膝短裙，高腰设计',
    '配饰：蝴蝶结腰封 + 及膝长袜 + 玛丽珍鞋',
  ],
  fabricGuess: [
    '外套：暗纹提花绸缎（光泽感强，适合垂坠）',
    '衬裙：雪纺 + 蕾丝拼接',
    '裙子：制服呢或厚雪纺（挺括保形）',
    '腰封：缎面 + 硬衬',
  ],
  colorScheme: [
    { name: '酒红外套', hex: '#8B1A3B' },
    { name: '米白衬裙', hex: '#FFF5E6' },
    { name: '墨绿腰封', hex: '#2D5A3D' },
    { name: '金色镶边', hex: '#D4AF37' },
  ],
  accessories: [
    '头顶大蝴蝶结发饰 × 1',
    '蕾丝手套（短款）× 2',
    '颈圈式丝带 choker × 1',
    '胸针（徽章造型）× 1',
  ],
  materials: [
    '金属按扣 × 6',
    '隐形拉链 × 2（20cm + 30cm）',
    '裙衬硬网纱 × 0.5m',
    '装饰水钻 / 珍珠 若干',
    '粘合衬（有纺）× 1m',
  ],
  craftDifficulties: [
    '立领交叉结构：注意领口贴合度，需加衬保形',
    '百褶裙：褶子均匀度要求高，建议用裙夹固定后蒸汽定型',
    '暗纹提花裁剪：对花对格难度高，用料需多预留15%',
    '蝴蝶结腰封：内部需加硬衬保持立体造型',
  ],
  patternTips: [
    '上衣后中开拉链，方便穿脱',
    '裙长建议膝盖上2-3cm，显腿长比例好',
    '腰封宽度建议8-10cm，修饰腰线效果最佳',
    '衬裙可做可拆卸设计，一衣多穿',
    '外套袖口加松紧带，营造七分袖灯笼感',
  ],
};

const MOCK_DRAW_IMAGES: DrawImage[] = [
  {
    id: 'd_001',
    imageUrl: '',
    prompt: '哥特萝莉风洋装，黑色蕾丝，十字装饰，暗黑系',
    style: '赛璐璐',
    createdAt: '2024-06-01',
    mode: 'text2img',
  },
  {
    id: 'd_002',
    imageUrl: '',
    prompt: '国风汉服少女，齐胸襦裙，飘带，仙气',
    style: '厚涂',
    createdAt: '2024-06-01',
    mode: 'text2img',
  },
  {
    id: 'd_003',
    imageUrl: '',
    prompt: '蒸汽朋克风格服装，齿轮，皮革，护目镜',
    style: '水彩',
    createdAt: '2024-06-01',
    mode: 'img2img',
  },
  {
    id: 'd_004',
    imageUrl: '',
    prompt: '魔法少女战斗服，星星元素，发光效果',
    style: '赛璐璐',
    createdAt: '2024-06-01',
    mode: 'img2img',
  },
];

let globalConfig: GlobalConfig = {
  defaultAnalyzeCount: 2,
  defaultDrawCount: 2,
};

let users = [...MOCK_USERS];

// 模拟异步延迟
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ====== 用户相关 ======
export async function loginApi(account: string, password: string): Promise<User> {
  await delay();
  const user = users.find((u) => u.account === account) || users[0];
  return { ...user };
}

export async function getCurrentUser(): Promise<User> {
  await delay();
  return { ...users[0] };
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  await delay();
  return true;
}

// ====== 额度相关 ======
export async function getQuota(): Promise<{ analyzeCount: number; drawCount: number }> {
  await delay();
  return { analyzeCount: 2, drawCount: 2 };
}

export async function deductQuota(type: 'analyze' | 'draw'): Promise<boolean> {
  await delay();
  return true;
}

export async function refundQuota(type: 'analyze' | 'draw'): Promise<boolean> {
  await delay();
  return true;
}

// ====== 服饰鉴定 ======
export interface SubmitAnalyzeParams {
  imageBase64: string;
}

export async function submitAnalyze(params: SubmitAnalyzeParams): Promise<AnalyzeResult> {
  await delay(1500);
  return { ...MOCK_ANALYZE, id: 'a_' + Date.now() };
}

export async function getAnalyzeHistory(): Promise<AnalyzeResult[]> {
  await delay();
  return [{ ...MOCK_ANALYZE }];
}

// ====== 绘梦工坊 ======
export interface Text2ImgParams {
  prompt: string;
  style: string;
}

export interface Img2ImgParams {
  imageBase64: string;
  prompt: string;
  style: string;
}

export async function text2img(params: Text2ImgParams): Promise<DrawImage> {
  await delay(2000);
  return {
    id: 'd_' + Date.now(),
    imageUrl: '',
    prompt: params.prompt,
    style: params.style,
    createdAt: new Date().toISOString().slice(0, 10),
    mode: 'text2img',
  };
}

export async function img2img(params: Img2ImgParams): Promise<DrawImage> {
  await delay(2000);
  return {
    id: 'd_' + Date.now(),
    imageUrl: '',
    prompt: params.prompt,
    style: params.style,
    createdAt: new Date().toISOString().slice(0, 10),
    mode: 'img2img',
  };
}

export async function getDrawHistory(): Promise<DrawImage[]> {
  await delay();
  return [...MOCK_DRAW_IMAGES];
}

// ====== 管理端 - 用户管理 ======
export async function adminListUsers(): Promise<User[]> {
  await delay();
  return [...users];
}

export interface AdminCreateUserParams {
  account: string;
  nickname: string;
  password: string;
  analyzeCount: number;
  drawCount: number;
}

export async function adminCreateUser(params: AdminCreateUserParams): Promise<User> {
  await delay();
  const newUser: User = {
    id: 'u_' + Date.now(),
    account: params.account,
    nickname: params.nickname,
    joinDate: new Date().toISOString().slice(0, 10),
    isAdmin: false,
    analyzeCount: params.analyzeCount,
    drawCount: params.drawCount,
    status: 'active',
  };
  users.push(newUser);
  return { ...newUser };
}

export interface AdminUpdateUserParams {
  id: string;
  nickname?: string;
  analyzeCount?: number;
  drawCount?: number;
  status?: 'active' | 'frozen';
}

export async function adminUpdateUser(params: AdminUpdateUserParams): Promise<User> {
  await delay();
  const idx = users.findIndex((u) => u.id === params.id);
  if (idx === -1) throw new Error('用户不存在');
  users[idx] = { ...users[idx], ...params };
  return { ...users[idx] };
}

export async function adminAdjustQuota(
  userId: string,
  type: 'analyze' | 'draw',
  delta: number
): Promise<User> {
  await delay();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('用户不存在');
  if (type === 'analyze') {
    users[idx].analyzeCount = Math.max(0, users[idx].analyzeCount + delta);
  } else {
    users[idx].drawCount = Math.max(0, users[idx].drawCount + delta);
  }
  return { ...users[idx] };
}

// ====== 管理端 - 全局配置 ======
export async function getGlobalConfig(): Promise<GlobalConfig> {
  await delay();
  return { ...globalConfig };
}

export async function updateGlobalConfig(config: Partial<GlobalConfig>): Promise<GlobalConfig> {
  await delay();
  globalConfig = { ...globalConfig, ...config };
  return { ...globalConfig };
}
