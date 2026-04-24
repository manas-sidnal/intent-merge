/**
 * Intent Merge — AI Conflict Resolver Script
 * Runs inside GitHub Actions after a failed git merge exposes conflict markers.
 * Reads conflicted files → calls Groq/Llama 3.1 → posts resolutions as PR comment.
 *
 * Node.js 20+ required (native fetch). No npm install needed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = parseInt(process.env.PR_NUMBER, 10);
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

const CONFLICT_REGEX = /<<<<<<< [^\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\n]*/g;

// ─── Groq API call ─────────────────────────────────────────────────────────

async function resolveWithGroq(current, incoming, filename) {
  const ext = path.extname(filename).slice(1) || 'text';

  const prompt = `You are an expert software engineer resolving a Git merge conflict in a ${ext} file.

CURRENT VERSION (HEAD):
${current}

INCOMING VERSION:
${incoming}

Rules:
- Intelligently merge both versions
- Preserve all important logic
- No duplication
- Return ONLY the merged code, no explanation, no markdown fences

Merged code:`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a senior software engineer. Output only code, never explanations.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? incoming;
}

// ─── GitHub comment poster ─────────────────────────────────────────────────

async function postComment(body) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${err}`);
  }

  console.log('✅ Posted resolution comment to PR #' + PR_NUMBER);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY secret is not set. Add it in repo Settings → Secrets.');
    process.exit(1);
  }

  // Get list of files with conflict markers
  let conflictedFiles;
  try {
    conflictedFiles = execSync('git diff --name-only --diff-filter=U', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    console.log('No conflicted files detected.');
    return;
  }

  if (conflictedFiles.length === 0) {
    console.log('✅ No conflicts found.');
    return;
  }

  console.log(`Found ${conflictedFiles.length} conflicted file(s):`, conflictedFiles);

  const allResolutions = [];

  for (const file of conflictedFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf-8');

    let match;
    let conflictIndex = 0;
    CONFLICT_REGEX.lastIndex = 0; // reset regex state

    while ((match = CONFLICT_REGEX.exec(content)) !== null) {
      const current = match[1].trim();
      const incoming = match[2].trim();
      conflictIndex++;

      console.log(`  Resolving conflict ${conflictIndex} in ${file}...`);

      try {
        const resolved = await resolveWithGroq(current, incoming, file);
        allResolutions.push({ file, conflictIndex, current, incoming, resolved });
        console.log(`  ✅ Resolved conflict ${conflictIndex} in ${file}`);
      } catch (err) {
        console.error(`  ❌ Failed to resolve conflict ${conflictIndex} in ${file}:`, err.message);
        allResolutions.push({ file, conflictIndex, current, incoming, resolved: null, error: err.message });
      }
    }
  }

  if (allResolutions.length === 0) {
    console.log('No resolutions to post.');
    return;
  }

  // Build the PR comment
  const sections = allResolutions.map(r => {
    const header = `### ${r.resolved ? '✅' : '❌'} Conflict ${r.conflictIndex} in \`${r.file}\``;

    if (!r.resolved) {
      return `${header}\n\n> ⚠️ Could not resolve automatically: ${r.error}`;
    }

    return [
      header,
      '',
      '<details>',
      '<summary><strong>📋 Click to view AI-resolved code</strong></summary>',
      '',
      '```',
      r.resolved,
      '```',
      '',
      '</details>'
    ].join('\n');
  });

  const successCount = allResolutions.filter(r => r.resolved).length;

  const commentBody = [
    '## 🤖 Intent Merge — AI Conflict Resolution',
    '',
    `Detected **${allResolutions.length} conflict(s)** across **${conflictedFiles.length} file(s)**.`,
    `Successfully resolved **${successCount}** of them using Groq + Llama 3.1.`,
    '',
    '> **To apply:** Copy the resolved code from each section below, or use the [Intent Merge VS Code Extension](https://marketplace.visualstudio.com/items?itemName=intent-merge) for 1-click application.',
    '',
    ...sections,
    '',
    '---',
    '*Powered by [Intent Merge](https://github.com) · Groq + Llama 3.1*'
  ].join('\n');

  await postComment(commentBody);

  // --- Report resolved conflicts to Supabase ---
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const orgId       = process.env.ORG_ID;
  const headRef     = process.env.HEAD_REF ?? '';
  const repoName    = `${REPO_OWNER}/${REPO_NAME}`;

  if (supabaseUrl && supabaseKey && orgId) {
    const rows = allResolutions
      .filter(r => r.resolved)
      .map(r => ({
        author:      process.env.PR_AUTHOR ?? 'unknown',
        commit_hash: process.env.HEAD_SHA  ?? '',
        file:        r.file,
        org_id:      orgId,
        event_type:  'resolved',
        source:      'github-pr-resolver',
        pr_number:   PR_NUMBER,
        repo:        repoName,
        branch:      headRef,
      }));

    if (rows.length > 0) {
      const res = await fetch(`${supabaseUrl}/rest/v1/conflicts`, {
        method: 'POST',
        headers: {
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(rows),
      });

      if (res.ok) {
        console.log(`✅ Reported ${rows.length} resolved conflict(s) to Supabase`);
      } else {
        const err = await res.text();
        console.error('Failed to report to Supabase:', err);
      }
    }
  } else {
    console.log('Supabase secrets not configured — skipping DB report.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
