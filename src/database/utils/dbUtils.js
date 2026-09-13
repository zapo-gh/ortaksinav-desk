import { TEST_PLAN_NAMES } from '../../config/constants';
import { getCurrentSession } from '../../services/localAuth';

export function isTestPlan(name) {
  const lower = String(name || '').toLowerCase().trim();
  return TEST_PLAN_NAMES.some(t => lower === t || lower.includes(t));
}

export function requireUserId() {
  const session = getCurrentSession();
  if (!session?.id) throw new Error('Bu işlem için oturum açmanız gerekiyor.');
  return session.id;
}
