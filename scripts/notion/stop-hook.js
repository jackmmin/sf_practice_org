#!/usr/bin/env node
/**
 * Stop hook (Claude Code): when a session ends, ask Claude to summarize the
 * session's completed work and log it to Notion via scripts/notion/log-task.sh,
 * then really stop. Guards against infinite loops using stop_hook_active.
 *
 * Reads hook input JSON from stdin, writes decision JSON to stdout (or nothing
 * to allow the stop as normal).
 */

let raw = '';
process.stdin.on('data', (d) => {
    raw += d;
});
process.stdin.on('end', () => {
    let input = {};
    try {
        input = JSON.parse(raw || '{}');
    } catch (e) {
        // Malformed input: fail safe, allow the stop.
        process.exit(0);
    }

    if (input.stop_hook_active) {
        // This Stop was already triggered by a previous block from this hook.
        // Do not block again, or Claude would loop forever.
        process.exit(0);
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toISOString().slice(11, 19).replace(/:/g, '');
    const sessionId = `sf_practice_org-${date}-${time}`;

    const reason = [
        '세션을 마치기 전에, 이번 세션에서 완료한 실질적인 작업(코드/설정/데이터 변경 등)이 있다면 요약해서 Notion에 기록하세요.',
        '다음 명령을 실제 값으로 채워서 실행한 뒤 정상적으로 종료하세요:',
        `bash scripts/notion/log-task.sh --title "<핵심 작업 한 줄 요약>" --summary "<3~5문장 상세 요약>" --project "SF Practice Org" --session-id "${sessionId}" --date "${date}"`,
        '이번 세션이 순수 질의응답이었거나 실질적인 변경이 전혀 없었다면 이 단계를 건너뛰고 바로 종료하세요.',
    ].join(' ');

    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    process.exit(0);
});
