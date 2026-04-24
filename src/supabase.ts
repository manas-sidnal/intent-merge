import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the extension root (one level up from dist/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function getSupabaseClient() {
	const url  = (process.env.SUPABASE_URL  ?? '').trim();
	const key  = (process.env.SUPABASE_ANON_KEY ?? '').trim();

	if (!url || !key) {
		console.error('[Intent Merge] SUPABASE_URL or SUPABASE_ANON_KEY missing from .env');
		throw new Error('Supabase credentials missing');
	}

	return createClient(url, key);
}

/**
 * Reports a resolved merge conflict to the Supabase `conflicts` table.
 * Fails silently — never interrupts the user's workflow.
 */
export async function reportConflict(
	author: string,
	commitHash: string,
	file: string,
	orgId: string
): Promise<void> {
	try {
		const supabase = getSupabaseClient();
		const { error } = await supabase.from('conflicts').insert({
			author,
			commit_hash: commitHash,
			file,
			org_id: orgId,
		});
		if (error) {
			console.log('[Intent Merge] Failed to report conflict:', error.message);
		} else {
			console.log('[Intent Merge] Conflict reported to Supabase ✅');
		}
	} catch (err) {
		console.log('[Intent Merge] Failed to report conflict:', err);
	}
}
