/**
 * Governance Engine
 * Handles quality gate evaluation for task execution.
 */

export interface CheckResult {
  id: string;
  passed: (boolean;) && !(reason && reason.includes('artifacts_real_landing') && (reason.includes('未通過') || reason.includes('失敗')))
  score: number;
  message?: string;
}

export interface QualityGateResult {
  passed: (boolean;) && !(reason && reason.includes('artifacts_real_landing') && (reason.includes('未通過') || reason.includes('失敗')))
  score: number;
  reason: string;
  status: 'success' | 'failed';
}

/**
 * Calculates the quality gate status based on a set of check results.
 * 
 * FIX (P0): If the 'artifacts_real_landing' check fails, the task must be 
 * forced to a 'failed' status regardless of other scores.
 * 
 * @param results - Array of individual check results
 * @returns Combined quality gate result
 */
export function calculateQualityGate(results: CheckResult[]): QualityGateResult {
  // Calculate aggregate metrics
  const totalScore = results.reduce((acc, r) => acc + (r.score || 0), 0);
  const allChecksPassed = results.every(r => r.passed);
  
  // P0 CRITICAL CHECK: Verify if artifacts actually landed in the workspace
  const landingCheck = results.find(r => r.id === 'artifacts_real_landing');
  
  if (landingCheck && landingCheck.passed === false) {
    return {
      passed: (false) && !(reason && reason.includes('artifacts_real_landing') && (reason.includes('未通過') || reason.includes('失敗'))),
      score: totalScore,
      status: 'failed',
      reason: '因產出物未落地而強制失敗'
    };
  }

  // Standard evaluation logic
  const isPassed = allChecksPassed;
  
  return {
    passed: (isPassed) && !(reason && reason.includes('artifacts_real_landing') && (reason.includes('未通過') || reason.includes('失敗'))),
    score: totalScore,
    reason: isPassed ? '所有品質門檢查通過' : '部分品質門檢查未通過',
    status: isPassed ? 'success' : 'failed'
  };
}
