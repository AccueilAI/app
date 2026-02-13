/**
 * RAG Evaluation Script
 *
 * Usage:
 *   npx tsx scripts/run-eval.ts
 *   npx tsx scripts/run-eval.ts --category titre_de_sejour
 *   npx tsx scripts/run-eval.ts --concurrency 3
 *
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 * Optional: COHERE_API_KEY (for reranking)
 */

import { TEST_SET } from '../lib/eval/test-set';
import { runEvaluation, type EvalReport } from '../lib/eval/runner';

async function main() {
  const args = process.argv.slice(2);

  // Parse args
  let category: string | null = null;
  let concurrency = 2;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      category = args[++i];
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[++i], 10) || 2;
    }
  }

  // Filter test set
  const cases = category
    ? TEST_SET.filter((c) => c.category === category)
    : TEST_SET;

  if (cases.length === 0) {
    console.error(`No test cases found${category ? ` for category: ${category}` : ''}`);
    process.exit(1);
  }

  console.log(`\n🧪 RAG Evaluation`);
  console.log(`   Cases: ${cases.length} | Concurrency: ${concurrency}`);
  if (category) console.log(`   Category: ${category}`);
  console.log('');

  const report = await runEvaluation(cases, { concurrency });

  printReport(report);

  // Save report to file
  const filename = `eval-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fs = await import('fs');
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${filename}`);
}

function printReport(report: EvalReport) {
  console.log('═'.repeat(70));
  console.log('  OVERALL AVERAGES');
  console.log('═'.repeat(70));
  printMetrics(report.averages);

  console.log('\n' + '─'.repeat(70));
  console.log('  BY CATEGORY');
  console.log('─'.repeat(70));
  for (const [cat, metrics] of Object.entries(report.byCategory)) {
    console.log(`\n  📂 ${cat}`);
    printMetrics(metrics, '    ');
  }

  console.log('\n' + '─'.repeat(70));
  console.log('  INDIVIDUAL RESULTS');
  console.log('─'.repeat(70));
  for (const r of report.results) {
    const topicRate =
      r.topicHits.expected.length > 0
        ? `${r.topicHits.found.length}/${r.topicHits.expected.length}`
        : 'N/A';
    const respRate =
      r.responseHits.expected.length > 0
        ? `${r.responseHits.found.length}/${r.responseHits.expected.length}`
        : 'N/A';

    const status = r.metrics.overall >= 0.7 ? '✅' : r.metrics.overall >= 0.5 ? '⚠️' : '❌';

    console.log(
      `\n  ${status} ${r.caseId} [${r.language}] — overall: ${r.metrics.overall}`,
    );
    console.log(`     "${r.query.slice(0, 60)}${r.query.length > 60 ? '...' : ''}"`);
    console.log(
      `     faith: ${r.metrics.faithfulness} | ctx: ${r.metrics.contextRelevance} | ans: ${r.metrics.answerRelevance} | cite: ${r.metrics.citationAccuracy}`,
    );
    console.log(
      `     topics: ${topicRate} | response-kw: ${respRate} | sources: ${r.sourceCount} | ${r.latencyMs}ms`,
    );
    if (r.topicHits.missing.length > 0) {
      console.log(`     ⚠ missing topics: ${r.topicHits.missing.join(', ')}`);
    }
    if (r.responseHits.missing.length > 0) {
      console.log(
        `     ⚠ missing in response: ${r.responseHits.missing.join(', ')}`,
      );
    }
    if (r.forbiddenHits.length > 0) {
      console.log(
        `     🚨 FORBIDDEN found: ${r.forbiddenHits.join(', ')}`,
      );
    }
  }

  if (report.failures.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('  ❌ FAILURES');
    console.log('─'.repeat(70));
    for (const f of report.failures) {
      console.log(`  ${f.caseId}: ${f.reason.slice(0, 100)}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(
    `  ${report.results.length}/${report.totalCases} passed | ${report.failures.length} failed`,
  );
  console.log('═'.repeat(70));
}

function printMetrics(m: { faithfulness: number; contextRelevance: number; answerRelevance: number; citationAccuracy: number; overall: number }, indent = '  ') {
  const bar = (v: number) => {
    const filled = Math.round(v * 20);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };

  console.log(
    `${indent}Faithfulness:     ${bar(m.faithfulness)} ${m.faithfulness}`,
  );
  console.log(
    `${indent}Context Rel.:     ${bar(m.contextRelevance)} ${m.contextRelevance}`,
  );
  console.log(
    `${indent}Answer Rel.:      ${bar(m.answerRelevance)} ${m.answerRelevance}`,
  );
  console.log(
    `${indent}Citation Acc.:    ${bar(m.citationAccuracy)} ${m.citationAccuracy}`,
  );
  console.log(
    `${indent}OVERALL:          ${bar(m.overall)} ${m.overall}`,
  );
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
