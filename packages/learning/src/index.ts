import { SCHEMA_VERSION } from '@collegenotes/domain';

export type Attempt = { id: string; activityId: string; draft: string; submitted: boolean };

export function newAttempt(activityId: string): Attempt {
  return { id: `att-${SCHEMA_VERSION}`, activityId, draft: '', submitted: false };
}
