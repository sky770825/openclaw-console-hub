/**
 * Report Generator - 報告生成器
 * 支援 Markdown、JSON、HTML 格式
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * 生成報告
   */
  generate(entries, type = 'markdown', options = {}) {
    switch (type.toLowerCase()) {
      case 'markdown':
      case 'md':
        return this.generateMarkdown(entries, options);
      case 'json':
        return this.generateJSON(entries, options);
      case 'html':
        return this.generateHTML(entries, options);
      default:
        throw new Error(`不支援的報告類型: ${type}`);
    }
  }

  /**
   * 計算統計資料
   */
  calculateStats(entries) {
    const stats = {
      total: entries.length,
      bySeverity: {},
      byService: {},
      byHour: {},
      timeRange: { start: null, end: null },
      errors: [],
      warnings: []
    };

    if (entries.length === 0) return stats;

    const timestamps = entries.map(e => new Date(e.timestamp).getTime()).filter(t => !isNaN(t));
    if (timestamps.length > 0) {
      stats.timeRange.start = new Date(Math.min(...timestamps));
      stats.timeRange.end = new Date(Math.max(...timestamps));
    }

    entries.forEach(entry => {
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
      if (entry.service) {
        stats.byService[entry.service] = (stats.byService[entry.service] || 0) + 1;
      }
      const hour = new Date(entry.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

      if (entry.severity === 'error' || entry.severity === 'critical') {
        stats.errors.push(entry);
      } else if (entry.severity === 'warn') {
        stats.warnings.push(entry);
      }
    });

    const errorCount = stats.bySeverity['error'] || 0;
    const criticalCount = stats.bySeverity['critical'] || 0;
    stats.errorRate = ((errorCount + criticalCount) / stats.total * 100).toFixed(2);
    stats.performance = this.extractPerformanceMetrics(entries);

    return stats;
  }

  extractPerformanceMetrics(entries) {
    const durations = entries
      .filter(e => e.duration_ms || e.duration || e.responseTime)
      .map(e => e.duration_ms || e.duration || e.responseTime);

    if (durations.length === 0) return null;

    const sorted = durations.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avg: Math.round(sum / durations.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍'
    };
    return icons[severity] || '•';
  }

  generateMarkdown(entries, options = {}) {
    const stats = this.calculateStats(entries);
    const fileName = options.fileName || 'unknown';
    const format = options.format || 'unknown';

    let report = `# 日誌分析報告

## 📋 摘要

| 項目 | 數值 |
|------|------|
| 分析檔案 | ${fileName} |
| 日誌格式 | ${format} |
| 總記錄數 | ${stats.total.toLocaleString()} |
| 時間範圍 | ${stats.timeRange.start ? stats.timeRange.start.toLocaleString() : 'N/A'} ~ ${stats.timeRange.end ? stats.timeRange.end.toLocaleString() : 'N/A'} |
| 錯誤率 | ${stats.errorRate}% |

## 📊 嚴重性分佈

| 嚴重性 | 數量 | 佔比 |
|--------|------|------|
`;

    const severityOrder = ['critical', 'error', 'warn', 'info', 'debug'];
    severityOrder.forEach(sev => {
      const count = stats.bySeverity[sev] || 0;
      const percent = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
      const icon = this.getSeverityIcon(sev);
      report += `| ${icon} ${sev.toUpperCase()} | ${count.toLocaleString()} | ${percent}% |\n`;
    });

    if (Object.keys(stats.byService).length > 0) {
      report += `\n## 🖥️ 服務統計\n\n| 服務 | 記錄數 |\n|------|--------|\n`;
      Object.entries(stats.byService)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([service, count]) => {
          report += `| ${service} | ${count.toLocaleString()} |\n`;
        });
    }

    if (stats.performance) {
      report += `\n## ⚡ 效能指標\n\n| 指標 | 數值 (ms) |\n|------|-----------|\n`;
      report += `| 請求數 | ${stats.performance.count.toLocaleString()} |\n`;
      report += `| 平均值 | ${stats.performance.avg} |\n`;
      report += `| 最小值 | ${stats.performance.min} |\n`;
      report += `| 最大值 | ${stats.performance.max} |\n`;
      report += `| P50 | ${stats.performance.p50} |\n`;
      report += `| P95 | ${stats.performance.p95} |\n`;
      report += `| P99 | ${stats.performance.p99} |\n`;
    }

    if (stats.errors.length > 0) {
      report += `\n## ❌ 錯誤記錄 (前 20 筆)\n\n`;
      stats.errors.slice(0, 20).forEach((err, idx) => {
        report += `### ${idx + 1}. [${new Date(err.timestamp).toLocaleString()}] ${err.service}\n\n`;
        report += `\`\`\`\n${err.message}\n\`\`\`\n\n`;
      });
    }

    if (stats.warnings.length > 0) {
      report += `\n## ⚠️ 警告記錄 (前 10 筆)\n\n`;
      stats.warnings.slice(0, 10).forEach((warn, idx) => {
        report += `${idx + 1}. \`[${new Date(warn.timestamp).toLocaleTimeString()}]\` ${warn.message.substring(0, 100)}\n`;
      });
    }

    report += `\n---\n*報告生成時間: ${new Date().toLocaleString()}*\n`;

    return report;
  }

  generateJSON(entries, options = {}) {
    const stats = this.calculateStats(entries);
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        fileName: options.fileName,
        format: options.format
      },
      summary: {
        total: stats.total,
        timeRange: {
          start: stats.timeRange.start?.toISOString(),
          end: stats.timeRange.end?.toISOString()
        },
        errorRate: stats.errorRate
      },
      severityDistribution: stats.bySeverity,
      serviceDistribution: stats.byService,
      performance: stats.performance,
      errors: stats.errors.slice(0, 50).map(e => ({
        timestamp: e.timestamp,
        service: e.service,
        message: e.message
      })),
      warnings: stats.warnings.slice(0, 30).map(e => ({
        timestamp: e.timestamp,
        service: e.service,
        message: e.message
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  generateHTML(entries, options = {}) {
    const stats = this.calculateStats(entries);
    const fileName = options.fileName || 'unknown';
    const format = options.format || 'unknown';
    const severityData = JSON.stringify([
      stats.bySeverity.critical || 0,
      stats.bySeverity.error || 0,
      stats.bySeverity.warn || 0,
      stats.bySeverity.info || 0,
      stats.bySeverity.debug || 0
    ]);

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>日誌分析報告 - ${fileName}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h2 { color: #667eea; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 500; }
        .severity-critical { background: #fee; color: #c33; }
        .severity-error { background: #fee; color: #c33; }
        .severity-warn { background: #ffeaa7; color: #856404; }
        .severity-info { background: #d1ecf1; color: #0c5460; }
        .severity-debug { background: #e2e3e5; color: #383d41; }
        .chart-container { position: relative; height: 300px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f8f9fa; font-weight: 600; }
        tr:hover { background: #f8f9fa; }
        .error-item { background: #fee; border-left: 4px solid #c33; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 日誌分析報告</h1>
            <div>檔案: ${fileName} | 格式: ${format} | 生成時間: ${new Date().toLocaleString()}</div>
        </div>

        <div class="card">
            <h2>📈 摘要統計</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total.toLocaleString()}</div>
                    <div class="stat-label">總記錄數</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.errorRate}%</div>
                    <div class="stat-label">錯誤率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Object.keys(stats.byService).length}</div>
                    <div class="stat-label">服務數</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(stats.bySeverity.critical || 0) + (stats.bySeverity.error || 0)}</div>
                    <div class="stat-label">錯誤總數</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>📊 嚴重性分佈</h2>
            <div class="chart-container">
                <canvas id="severityChart"></canvas>
            </div>
            <table>
                <tr><th>嚴重性</th><th>數量</th><th>佔比</th></tr>
                ${['critical', 'error', 'warn', 'info', 'debug'].map(sev => {
                  const count = stats.bySeverity[sev] || 0;
                  const percent = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
                  return `<tr><td><span class="severity-badge severity-${sev}">${sev.toUpperCase()}</span></td><td>${count.toLocaleString()}</td><td>${percent}%</td></tr>`;
                }).join('')}
            </table>
        </div>

        ${stats.errors.length > 0 ? `
        <div class="card">
            <h2>❌ 錯誤記錄</h2>
            ${stats.errors.slice(0, 10).map(e => `
                <div class="error-item">
                    <div class="error-time">${new Date(e.timestamp).toLocaleString()} | ${e.service}</div>
                    <div>${e.message}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="footer">
            由 Log Analyzer Skill v1.0.0 生成
        </div>
    </div>

    <script>
        const ctx = document.getElementById('severityChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'Error', 'Warning', 'Info', 'Debug'],
                datasets: [{
                    data: ${severityData},
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#17a2b8', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    </script>
</body>
</html>`;
  }
}

module.exports = ReportGenerator;
