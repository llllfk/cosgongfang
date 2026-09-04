/**
 * 火山引擎控制台常给出 channel_binding=require。
 * node-pg 对该参数支持不完整，会导致登录/查询直接失败。
 */
export function sanitizeDatabaseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.searchParams.delete('channel_binding');
    const sslmode = u.searchParams.get('sslmode');
    if (!sslmode || sslmode === 'verify-full' || sslmode === 'verify-ca') {
      u.searchParams.set('sslmode', 'require');
    }
    return u.toString();
  } catch {
    return raw
      .replace(/([?&])channel_binding=[^&]*/gi, '$1')
      .replace(/\?&/, '?')
      .replace(/[?&]$/, '');
  }
}
