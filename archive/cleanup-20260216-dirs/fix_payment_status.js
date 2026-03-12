#!/usr/bin/env node
/**
 * 華地產付款狀態修復腳本
 * 將 CSV 中標記為「已付款」的記錄更新到資料庫
 */

const SUPABASE_URL = 'https://kwxlxjfcdghpguypadvi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGx4amZjZGdocGd1eXBhZHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODk5NTMsImV4cCI6MjA4NDM2NTk1M30.0KJIXhxlPOx-5tWQyX12DMNXcWCLc2NmMCyoJY4y024';
const TABLE = 'registrations';
const SCHEMA = 'huadrink';

// CSV 中標記為「已付款」的報名編號（第22欄為「已付款」）
const PAID_FROM_CSV = [
  "DINE-0303-4811", "DINE-0303-3359", "DINE-0303-1174", "DINE-0303-1331",
  "DINE-0303-3667", "DINE-0303-0425", "DINE-0303-5986", "DINE-0303-0511",
  "DINE-0303-4035", "DINE-0303-2080", "DINE-0303-5078", "DINE-0303-2905",
  "DINE-0303-4197", "DINE-0303-6400", "DINE-0303-4286", "DINE-0303-4140",
  "DINE-0303-9258", "DINE-0303-3516", "DINE-0303-7614", "DINE-0303-4724",
  "DINE-0303-2267", "DINE-0303-6994", "DINE-0303-5740", "DINE-0303-7621",
  "DINE-0303-2090", "DINE-0303-9346", "DINE-0303-6552", "DINE-0303-4556",
  "DINE-0303-6777", "DINE-0303-2724", "DINE-0303-2057", "DINE-0303-2228",
  "DINE-0303-5343", "DINE-0303-3509", "DINE-0303-5774", "DINE-0303-7723",
  "DINE-0303-3115", "DINE-0303-9150", "DINE-0303-3718", "DINE-0303-2272",
  "DINE-0303-9498", "DINE-0303-7555", "DINE-0303-8929", "DINE-0303-5240",
  "DINE-0303-0747", "DINE-0303-9957", "DINE-0303-2941", "DINE-0303-9202",
  "DINE-0303-2771", "DINE-0303-3111", "DINE-0303-5542", "DINE-0303-9887",
  "DINE-0303-0410"
];

async function updatePaymentStatus(refCode) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?ref_code=eq.${encodeURIComponent(refCode)}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ pay_status: 'paid' })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`更新 ${refCode} 失敗: ${error}`);
  }
  
  return response.status === 204 || response.status === 200;
}

async function getCurrentStatus() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=ref_code,pay_status`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json'
    }
  });
  
  return await response.json();
}

async function main() {
  console.log('=== 華地產付款狀態修復 ===\n');
  
  // 1. 取得目前資料庫狀態
  console.log('📊 查詢目前資料庫狀態...');
  const currentData = await getCurrentStatus();
  
  const beforeStats = {
    total: currentData.length,
    paid: currentData.filter(r => r.pay_status === 'paid').length,
    unpaid: currentData.filter(r => r.pay_status === 'unpaid').length
  };
  
  console.log(`   總筆數: ${beforeStats.total}`);
  console.log(`   已付款: ${beforeStats.paid}`);
  console.log(`   未付款: ${beforeStats.unpaid}\n`);
  
  // 2. 比對需要修復的記錄
  console.log('🔍 比對 CSV 與資料庫...');
  const needFix = [];
  
  for (const refCode of PAID_FROM_CSV) {
    const dbRecord = currentData.find(r => r.ref_code === refCode);
    if (dbRecord && dbRecord.pay_status === 'unpaid') {
      needFix.push(refCode);
    }
  }
  
  console.log(`   CSV 已付款筆數: ${PAID_FROM_CSV.length}`);
  console.log(`   需要修復筆數: ${needFix.length}\n`);
  
  // 3. 執行修復
  console.log('🔧 開始修復付款狀態...');
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < needFix.length; i++) {
    const refCode = needFix[i];
    try {
      await updatePaymentStatus(refCode);
      successCount++;
      process.stdout.write(`   [${i+1}/${needFix.length}] ✅ ${refCode}\n`);
    } catch (err) {
      failCount++;
      process.stdout.write(`   [${i+1}/${needFix.length}] ❌ ${refCode}: ${err.message}\n`);
    }
    
    // 避免 rate limit
    if (i < needFix.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  console.log(`\n   修復完成: ${successCount} 筆成功, ${failCount} 筆失敗`);
  
  // 4. 驗證結果
  console.log('\n📋 驗證修復結果...');
  const afterData = await getCurrentStatus();
  
  const afterStats = {
    total: afterData.length,
    paid: afterData.filter(r => r.pay_status === 'paid').length,
    unpaid: afterData.filter(r => r.pay_status === 'unpaid').length
  };
  
  console.log(`   總筆數: ${afterStats.total}`);
  console.log(`   已付款: ${afterStats.paid}`);
  console.log(`   未付款: ${afterStats.unpaid}`);
  
  // 輸出 JSON 報告
  const report = {
    csv_total: 54,
    csv_paid: 53,
    csv_unpaid: 1,
    db_before_total: beforeStats.total,
    db_before_paid: beforeStats.paid,
    db_before_unpaid: beforeStats.unpaid,
    db_after_total: afterStats.total,
    db_after_paid: afterStats.paid,
    db_after_unpaid: afterStats.unpaid,
    fixed_count: successCount,
    failed_count: failCount,
    csv_match: afterStats.paid === 53
  };
  
  console.log('\n' + JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error('執行失敗:', err);
  process.exit(1);
});
