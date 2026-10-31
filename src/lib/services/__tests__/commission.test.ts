import {
  computeCommissionMath,
  calculateCommissionForTransaction,
} from '../commission-service';

/**
 * Self-contained executable unit test suite for Commission Calculation Engine
 */
export function runCommissionUnitTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      results.push(`✓ PASS: ${desc}`);
    } else {
      results.push(`✗ FAIL: ${desc}`);
      allPassed = false;
    }
  }

  // Test 1: Integer cents rounding on irregular amount
  // 13.333,33 TL -> 1333333 cents at 8%
  // 1333333 * 0.08 = 106666.64 -> round to 106667 cents (1066.67 TL)
  const t1 = computeCommissionMath(1333333, 8.0, 0.0);
  assert(
    'Irregular cent amount rounded to exact integer cents',
    t1.commissionAmountCents === 106667 &&
      t1.netCompanyAmountCents === 1226666 &&
      t1.commissionAmountCents + t1.netCompanyAmountCents === 1333333
  );

  // Test 2: %20 VAT Separation
  // Commission = 1200 cents (12.00 TL)
  // Base = 1200 / 1.2 = 1000 cents -> VAT = 200 cents
  const t2 = computeCommissionMath(1500000, 8.0, 0.0);
  assert(
    'VAT (%20) correctly computed from platform commission',
    t2.vatAmountCents === Math.round(t2.commissionAmountCents - t2.commissionAmountCents / 1.2)
  );

  // Test 3: Plan discount application
  // 100.000 TL (10000000 cents), 8% base rate, 2% plan discount -> 6% applied
  const t3 = computeCommissionMath(10000000, 8.0, 2.0);
  assert(
    'Membership plan discount applied (8% - 2% = 6%)',
    t3.appliedRatePercent === 6.0 && t3.commissionAmountCents === 600000
  );

  // Test 4: Plan discount exceeding base rate does not produce negative fee
  const t4 = computeCommissionMath(500000, 3.0, 5.0);
  assert('Commission cannot drop below 0%', t4.appliedRatePercent === 0.0 && t4.commissionAmountCents === 0);

  return { passed: allPassed, results };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const { passed, results } = runCommissionUnitTests();
  console.log('--- ŞANTİYE GO KOMİSYON MOTORU TEST RAPORU ---');
  results.forEach((r) => console.log(r));
  console.log(`Sonuç: ${passed ? 'TÜM TESTLER BAŞARILI' : 'BAZI TESTLER BAŞARISIZ'}`);
  process.exit(passed ? 0 : 1);
}
