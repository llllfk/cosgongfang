/** 登录账号规则：仅字母或数字 */

const ACCOUNT_RE = /^[a-zA-Z0-9]+$/;

/** 输入时过滤非法字符 */
export function sanitizeAccountInput(raw: string) {
  return String(raw || '').replace(/[^a-zA-Z0-9]/g, '');
}

/** 校验账号，通过则返回规范化字符串，否则抛错 */
export function validateAccount(account: string): string {
  const a = String(account || '').trim();
  if (!a) throw new Error('请填写账号');
  if (a.length < 3) throw new Error('账号至少 3 位字母或数字');
  if (a.length > 32) throw new Error('账号最多 32 位');
  if (!ACCOUNT_RE.test(a)) {
    throw new Error('账号仅支持字母或数字组合，不能包含特殊字符和中文');
  }
  return a;
}
