import { getCurrentUserRow, requireUser } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-response';

export async function GET() {
  try {
    const user = requireUser(await getCurrentUserRow());
    return jsonOk({
      analyzeCount: user.analyzeCount,
      drawCount: user.drawCount,
    });
  } catch (error) {
    return jsonError(error);
  }
}
