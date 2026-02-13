/**
 * Feedback Analysis Script
 *
 * Usage:
 *   npx tsx scripts/analyze-feedback.ts
 *   npx tsx scripts/analyze-feedback.ts --days 7
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { analyzeFeedback, type FeedbackReport } from '../lib/feedback/analyzer';

async function main() {
  const args = process.argv.slice(2);
  let days = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[++i], 10) || 30;
    }
  }

  console.log(`\n📊 Feedback Analysis (last ${days} days)\n`);

  const report = await analyzeFeedback(days);
  printReport(report);

  // Save report
  const filename = `feedback-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fs = await import('fs');
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${filename}`);
}

function printReport(report: FeedbackReport) {
  const { stats } = report;

  // Overall stats
  console.log('═'.repeat(60));
  console.log('  OVERALL SATISFACTION');
  console.log('═'.repeat(60));
  console.log(`  Total feedback:    ${stats.total}`);
  console.log(`  👍 Thumbs up:      ${stats.thumbsUp}`);
  console.log(`  👎 Thumbs down:    ${stats.thumbsDown}`);
  console.log(
    `  Satisfaction:      ${stats.satisfactionRate}%  ${stats.satisfactionRate >= 70 ? '✅' : '⚠️'}`,
  );

  // Language breakdown
  if (Object.keys(report.languageBreakdown).length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  BY LANGUAGE');
    console.log('─'.repeat(60));
    for (const [lang, langStats] of Object.entries(report.languageBreakdown)) {
      console.log(
        `  ${lang}: ${langStats.satisfactionRate}% (${langStats.thumbsUp}👍 ${langStats.thumbsDown}👎)`,
      );
    }
  }

  // Insights
  if (report.insights.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  🔍 INSIGHTS');
    console.log('─'.repeat(60));
    for (const insight of report.insights) {
      const icon =
        insight.severity === 'high'
          ? '🚨'
          : insight.severity === 'medium'
            ? '⚠️'
            : 'ℹ️';
      console.log(`  ${icon} [${insight.type}] ${insight.description}`);
    }
  }

  // Content gaps
  if (report.contentGaps.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  📭 CONTENT GAPS (downvoted + low sources)');
    console.log('─'.repeat(60));
    for (const gap of report.contentGaps.slice(0, 10)) {
      console.log(
        `  • "${gap.query}" — ${gap.sourceCount} sources, ${gap.occurrences}x downvoted [${gap.language}]`,
      );
    }
  }

  // Top queries
  if (report.topQueries.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  🔥 TOP QUERIES');
    console.log('─'.repeat(60));
    for (const q of report.topQueries.slice(0, 10)) {
      console.log(`  ${q.count}x  "${q.query}"`);
    }
  }

  // Golden examples
  if (report.goldenExamples.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log(`  ⭐ GOLDEN EXAMPLES (${report.goldenExamples.length} upvoted responses)`);
    console.log('─'.repeat(60));
    for (const g of report.goldenExamples.slice(0, 5)) {
      console.log(`  Q: "${g.query.slice(0, 80)}"`);
      console.log(`  A: "${g.response.slice(0, 100)}..." (${g.sourceCount} sources)`);
      console.log('');
    }
  }

  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
