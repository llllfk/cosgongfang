import { clearSessionCookie, destroySession, getSessionToken } from '@/lib/auth';
import { jsonOk } from '@/lib/api-response';

export async function POST() {
  const token = await getSessionToken();
  await destroySession(token);
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
