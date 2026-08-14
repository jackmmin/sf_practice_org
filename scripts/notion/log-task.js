#!/usr/bin/env node
/**
 * Create a row in the "개인프로젝트" Notion database to log a completed task.
 *
 * Required env vars (loaded from .env by the calling shell script):
 *   NOTION_TOKEN, NOTION_DATA_SOURCE_ID, NOTION_VERSION
 *
 * Usage:
 *   node scripts/notion/log-task.js \
 *     --title "작업 제목" \
 *     --summary "작업 요약" \
 *     --project "프로젝트명" \
 *     --session-id "세션 식별자" \
 *     [--date 2026-08-14]
 */

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = argv[i + 1];
            args[key] = value;
            i += 1;
        }
    }
    return args;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const required = ['title', 'summary', 'project', 'session-id'];
    const missing = required.filter((key) => !args[key]);
    if (missing.length > 0) {
        console.error(`Missing required arguments: ${missing.map((m) => `--${m}`).join(', ')}`);
        process.exit(1);
    }

    const token = process.env.NOTION_TOKEN;
    const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
    const notionVersion = process.env.NOTION_VERSION || '2025-09-03';

    if (!token || !dataSourceId) {
        console.error('Missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID environment variables. Check .env.');
        process.exit(1);
    }

    const date = args.date || new Date().toISOString().slice(0, 10);

    const payload = {
        parent: { type: 'data_source_id', data_source_id: dataSourceId },
        properties: {
            작업: { title: [{ text: { content: args.title } }] },
            요약: { rich_text: [{ text: { content: args.summary } }] },
            날짜: { date: { start: date } },
            프로젝트: { select: { name: args.project } },
            '세션 ID': { rich_text: [{ text: { content: args['session-id'] } }] },
        },
    };

    const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': notionVersion,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (!res.ok) {
        console.error('Notion API error:', JSON.stringify(body, null, 2));
        process.exit(1);
    }

    console.log('Created Notion page:', body.url);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
