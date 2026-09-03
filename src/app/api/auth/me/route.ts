import { getCurrentUserRow, publicUser, requireUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function GET() {
  try {
    const user = requireUser(await getCurrentUserRow());
    return jsonOk({ user: publicUser(user) });
  } catch (error) {
    return jsonError(error, '未登录');
  }
}
