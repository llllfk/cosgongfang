/** 密码规则：8–20 位，英文字母 / 数字 / 特殊符号（可打印 ASCII，不含空格） */

const PASSWORD_RE = /^[\x21-\x7E]+$/;

/** 校验密码，通过则返回原字符串，否则抛错 */
export function validatePassword(password: string): string {
  const p = String(password ?? '');
  if (!p) throw new Error('请填写密码');
  if (p.length < 8) throw new Error('密码至少 8 位');
  if (p.length > 20) throw new Error('密码最多 20 位');
  if (!PASSWORD_RE.test(p)) {
    throw new Error('密码仅支持英文字母、数字和特殊符号，不能包含空格或中文');
  }
  return p;
}
