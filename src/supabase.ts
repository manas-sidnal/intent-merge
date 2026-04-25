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
	orgId: string,
	branch?: string
): Promise<string | null> {
	try {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.from('conflicts').insert({
			author,
			commit_hash: commitHash,
			file,
			org_id: orgId,
			event_type: 'resolved',
			source:     'vscode',
			branch:     branch ?? null,
		}).select('id').single();
		if (error) {
			console.log('[Intent Merge] Failed to report conflict:', error.message);
			return null;
		}
		console.log('[Intent Merge] Conflict reported to Supabase ✅ id:', data.id);
		return data.id as string;
	} catch (err) {
		console.log('[Intent Merge] Failed to report conflict:', err);
		return null;
	}
}

/**
 * Deletes a previously reported conflict row by its UUID.
 * Called when the user clicks Undo in the panel.
 */
export async function deleteConflict(id: string): Promise<void> {
	try {
		const supabase = getSupabaseClient();
		const { error } = await supabase.from('conflicts').delete().eq('id', id);
		if (error) {
			console.log('[Intent Merge] Failed to delete conflict row:', error.message);
		} else {
			console.log('[Intent Merge] Conflict row deleted from Supabase ✅');
		}
	} catch (err) {
		console.log('[Intent Merge] Failed to delete conflict row:', err);
	}
}
