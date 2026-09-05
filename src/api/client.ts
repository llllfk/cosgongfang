// 前端 API 客户端：全部走服务端真实数据库，不再使用本地 mock 数据

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
  costumeStructure: string[];
  fabricGuess: string[];
  colorScheme: { name: string; hex: string }[];
  accessories: string[];
  materials: string[];
  craftDifficulties: string[];
  patternTips: string[];
  /** 完整定制需求报告（新结构；旧记录可能为空） */
  report?: {
    summary: string;
    parts: Array<{
      name: string;
      structure: string;
      details: string[];
      fabric: string[];
      craft: string[];
    }>;
    printsEmbroidery: string[];
    accessories: string[];
    colorScheme: { name: string; hex: string }[];
    materials: {
      lining: string[];
      hardware: string[];
      notions: string[];
      wig: string[];
    };
    sizingNotes: string[];
    risks: string[];
    toPatternMaker: string;
  };
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
  /** 已解析的可展示二维码 URL（可能为空） */
  wechatQrUrl?: string | null;
  hasWechatQr?: boolean;
  /** 生成图文字水印；空表示不加 */
  watermarkText?: string;
}

export interface SubmitAnalyzeParams {
  imageBase64: string;
  /** 专供落库/S3 的缩小图（可选，不传则用 imageBase64） */
  storeImageBase64?: string;
}

export interface Text2ImgParams {
  prompt: string;
  style: string;
  size?: string;
}

export interface Img2ImgParams {
  imagesBase64: string[];
  /** 专供使用记录落库的缩小预览（可选） */
  refStoreImages?: string[];
  prompt: string;
  style: string;
  size?: string;
}

export interface AdminCreateUserParams {
  account: string;
  nickname: string;
  password: string;
  analyzeCount: number;
  drawCount: number;
}

export interface AdminUpdateUserParams {
  id: string;
  account?: string;
  nickname?: string;
  analyzeCount?: number;
  drawCount?: number;
  status?: 'active' | 'frozen';
  /** 填写则重置密码 */
  password?: string;
}

type RequestOptions = RequestInit & { timeoutMs?: number };

async function request<T>(url: string, init?: RequestOptions): Promise<T> {
  const { timeoutMs = 0, signal: outerSignal, ...fetchInit } = init || {};

  const controller = timeoutMs > 0 ? new AbortController() : null;
  const timer =
    controller && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  if (outerSignal && controller) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      ...fetchInit,
      headers: {
        'Content-Type': 'application/json',
        ...(fetchInit.headers || {}),
      },
      credentials: 'include',
      signal: controller?.signal ?? outerSignal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试或换一张更小的图片');
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function syncLocalUser(user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cos_user', JSON.stringify(user));
  localStorage.setItem('cos_analyze_count', String(user.analyzeCount));
  localStorage.setItem('cos_draw_count', String(user.drawCount));
  window.dispatchEvent(new Event('cos-quota-changed'));
}

export function syncLocalQuota(quota: { analyzeCount: number; drawCount: number }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cos_analyze_count', String(quota.analyzeCount));
  localStorage.setItem('cos_draw_count', String(quota.drawCount));
  const raw = localStorage.getItem('cos_user');
  if (raw) {
    try {
      const user = JSON.parse(raw) as User;
      user.analyzeCount = quota.analyzeCount;
      user.drawCount = quota.drawCount;
      localStorage.setItem('cos_user', JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event('cos-quota-changed'));
}

export async function loginApi(account: string, password: string): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
  syncLocalUser(data.user);
  return data.user;
}

export async function registerApi(params: {
  account: string;
  nickname: string;
  password: string;
  passwordConfirm: string;
}): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  syncLocalUser(data.user);
  return data.user;
}

export async function logoutApi(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('cos_user');
  localStorage.removeItem('cos_analyze_count');
  localStorage.removeItem('cos_draw_count');
  window.dispatchEvent(new Event('cos-quota-changed'));
}

export async function getCurrentUser(): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/me');
  syncLocalUser(data.user);
  return data.user;
}

export async function updateProfileApi(params: {
  nickname?: string;
  oldPassword?: string;
  newPassword?: string;
}): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
  syncLocalUser(data.user);
  return data.user;
}

export async function getQuota(): Promise<{ analyzeCount: number; drawCount: number }> {
  const data = await request<{ analyzeCount: number; drawCount: number }>('/api/quota');
  syncLocalQuota(data);
  return data;
}

export async function submitAnalyze(params: SubmitAnalyzeParams): Promise<AnalyzeResult> {
  const data = await request<{ result: AnalyzeResult; quota: { analyzeCount: number; drawCount: number } }>(
    '/api/analyze',
    {
      method: 'POST',
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        storeImageBase64: params.storeImageBase64,
      }),
      // 略长于服务端 ARK_VISION_TIMEOUT_MS(默认 5 分钟)
      timeoutMs: 330_000,
    }
  );
  syncLocalQuota(data.quota);
  return data.result;
}

export async function getAnalyzeHistory(): Promise<AnalyzeResult[]> {
  const data = await request<{ items: AnalyzeResult[] }>('/api/analyze');
  return data.items;
}

export async function text2img(params: Text2ImgParams): Promise<DrawImage> {
  const data = await request<{ image: DrawImage; quota: { analyzeCount: number; drawCount: number } }>(
    '/api/draw',
    {
      method: 'POST',
      body: JSON.stringify({
        mode: 'text2img',
        prompt: params.prompt,
        style: params.style,
        size: params.size,
      }),
      // Seedream Pro 可能 1~2 分钟，略长于服务端 maxDuration 缓冲
      timeoutMs: 280_000,
    }
  );
  syncLocalQuota(data.quota);
  if (!data.image?.id) throw new Error('生成成功但未返回作品数据');
  return data.image;
}

export async function img2img(params: Img2ImgParams): Promise<DrawImage> {
  const data = await request<{ image: DrawImage; quota: { analyzeCount: number; drawCount: number } }>(
    '/api/draw',
    {
      method: 'POST',
      body: JSON.stringify({
        mode: 'img2img',
        prompt: params.prompt,
        style: params.style,
        size: params.size,
        imagesBase64: params.imagesBase64,
        refStoreImages: params.refStoreImages,
      }),
      timeoutMs: 280_000,
    }
  );
  syncLocalQuota(data.quota);
  if (!data.image?.id) throw new Error('生成成功但未返回作品数据');
  return data.image;
}

export async function getDrawHistory(): Promise<DrawImage[]> {
  const data = await request<{ items: DrawImage[] }>('/api/draw');
  return data.items;
}

export type DesignView = 'three' | 'parts';

export interface DesignSheetResult {
  view: DesignView;
  label: string;
  image: DrawImage;
}

export async function generateDesignSheet(params: {
  view: DesignView;
  imageBase64: string;
  storeImageBase64?: string;
  note?: string;
  size?: string;
}): Promise<DesignSheetResult> {
  const data = await request<
    DesignSheetResult & { quota: { analyzeCount: number; drawCount: number } }
  >('/api/design', {
    method: 'POST',
    body: JSON.stringify({
      view: params.view,
      imageBase64: params.imageBase64,
      storeImageBase64: params.storeImageBase64,
      note: params.note,
      size: params.size,
    }),
    timeoutMs: 280_000,
  });
  syncLocalQuota(data.quota);
  if (!data.image?.id) throw new Error('生成成功但未返回设计稿');
  return { view: data.view, label: data.label, image: data.image };
}

export interface UsageItem {
  id: string;
  type: 'analyze' | 'draw';
  createdAt: string;
  summary: string;
  detail?: string;
  style?: string;
  mode?: string;
  /** 绘梦输出图 */
  imageUrl?: string;
  /** 鉴定输入图 */
  inputImageUrl?: string;
  /** 绘梦参考图 */
  refImageUrls?: string[];
  /** 绘梦提示词 */
  prompt?: string;
  userId?: string;
  nickname?: string;
  account?: string;
  analyze?: {
    costumeStructure: string[];
    fabricGuess: string[];
    colorScheme: { name: string; hex: string }[];
    accessories: string[];
    materials: string[];
    craftDifficulties: string[];
    patternTips: string[];
    report?: AnalyzeResult['report'];
  };
}

export async function getMyUsage(): Promise<UsageItem[]> {
  const data = await request<{ items: UsageItem[] }>('/api/usage');
  return data.items;
}

export async function adminListUsage(params?: {
  type?: 'all' | 'analyze' | 'draw';
  userId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: UsageItem[]; total: number; page: number; pageSize: number }> {
  const q = new URLSearchParams();
  if (params?.type && params.type !== 'all') q.set('type', params.type);
  if (params?.userId) q.set('userId', params.userId);
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  const qs = q.toString();
  return request<{ items: UsageItem[]; total: number; page: number; pageSize: number }>(
    `/api/admin/usage${qs ? `?${qs}` : ''}`
  );
}

export interface AdminListUsersParams {
  page?: number;
  pageSize?: number;
  /** 昵称或账号模糊搜索 */
  q?: string;
}

export interface AdminListUsersResult {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export async function adminListUsers(
  params?: AdminListUsersParams
): Promise<AdminListUsersResult> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.q?.trim()) q.set('q', params.q.trim());
  const qs = q.toString();
  return request<AdminListUsersResult>(`/api/admin/users${qs ? `?${qs}` : ''}`);
}

export async function adminCreateUser(params: AdminCreateUserParams): Promise<User> {
  const data = await request<{ user: User }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data.user;
}

export async function adminUpdateUser(params: AdminUpdateUserParams): Promise<User> {
  const { id, ...rest } = params;
  const data = await request<{ user: User }>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(rest),
  });
  return data.user;
}

export async function adminAdjustQuota(
  userId: string,
  type: 'analyze' | 'draw',
  delta: number
): Promise<User> {
  const data = await request<{ user: User }>(`/api/admin/users/${userId}/quota`, {
    method: 'POST',
    body: JSON.stringify({ type, delta }),
  });
  return data.user;
}

export async function getGlobalConfig(): Promise<GlobalConfig> {
  return request<GlobalConfig>('/api/admin/config');
}

export async function updateGlobalConfig(
  config: Partial<GlobalConfig> & {
    wechatQrImageBase64?: string;
    clearWechatQr?: boolean;
  }
): Promise<GlobalConfig> {
  return request<GlobalConfig>('/api/admin/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function getContactQr(): Promise<{
  wechatQrUrl: string | null;
  hasWechatQr: boolean;
}> {
  return request('/api/contact');
}
