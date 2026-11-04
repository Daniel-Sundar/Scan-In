import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';

/** Writes via service role (audit_events has no insert policy for end users). */
export async function audit(actorId: string | null, action: string, entity?: string, entityId?: string, meta: Record<string, unknown> = {}) {
  try {
    const db = await createAdminClient();
    await db.from('audit_events').insert({ actor_id: actorId, action, entity, entity_id: entityId, meta });
  } catch (e) {
    console.error('audit failed', action, e);
  }
}
