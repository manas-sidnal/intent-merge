import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pgvhqhyzqkrlovvjktre.supabase.co';
const SUPABASE_ANON_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndmhxaHl6cWtybG92dmprdHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMDc1MjcsImV4cCI6MjA5MjU4MzUyN30.nt9Jfy8CU55M_lXfzaSeUdr8sDqC3LDntrH5od66OnY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
		const { error } = await supabase.from('conflicts').insert({
			author,
			commit_hash: commitHash,
			file,
			org_id: orgId,
		});
		if (error) {
			console.log('[Intent Merge] Failed to report conflict:', error.message);
		}
	} catch (err) {
		console.log('[Intent Merge] Failed to report conflict:', err);
	}
}
