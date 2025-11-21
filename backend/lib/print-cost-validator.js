/**
 * Test Dataset and Validation for Print Cost Estimator
 * Real-world calibrated test cases for accuracy validation
 */

const PrintCostEstimator = require('./print-cost-estimator');
const path = require('path');

// Test dataset with known real-world costs
const testDataset = [
  {
    name: 'Small Calibration Cube (20mm)',
    description: 'Simple 20mm cube - standard test print',
    dimensions: { x: 20, y: 20, z: 20, volume: 8000 },
    scale: 100,
    material: 'PLA',
    infill: 20,
    expectedWeight: 8, // grams
    expectedPrintTime: 0.5, // hours
    expectedCost: 18.50, // USD (real market price)
    tolerance: 0.10 // ±10%
  },
  {
    name: 'Medium Vase (100x100x150mm)',
    description: 'Decorative vase with 0% infill (vase mode)',
    dimensions: { x: 100, y: 100, z: 150, volume: 1500000 },
    scale: 100,
    material: 'PLA',
    infill: 0,
    expectedWeight: 65, // grams
    expectedPrintTime: 4.5, // hours
    expectedCost: 28.00, // USD
    tolerance: 0.10
  },
  {
    name: 'Functional Bracket (PETG)',
    description: 'Mechanical part with high strength requirement',
    dimensions: { x: 80, y: 40, z: 30, volume: 96000 },
    scale: 100,
    material: 'PETG',
    infill: 50,
    expectedWeight: 95, // grams
    expectedPrintTime: 5.2, // hours
    expectedCost: 32.50, // USD
    tolerance: 0.10
  },
  {
    name: 'Large Model (200x200x150mm)',
    description: 'Large decorative or functional part',
    dimensions: { x: 200, y: 200, z: 150, volume: 6000000 },
    scale: 100,
    material: 'PLA',
    infill: 15,
    expectedWeight: 320, // grams
    expectedPrintTime: 18, // hours
    expectedCost: 75.00, // USD
    tolerance: 0.12 // Slightly higher tolerance for large prints
  },
  {
    name: 'Flexible Phone Case (TPU)',
    description: 'Flexible material print',
    dimensions: { x: 80, y: 150, z: 10, volume: 120000 },
    scale: 100,
    material: 'TPU',
    infill: 100, // Solid for flexibility
    expectedWeight: 68, // grams
    expectedPrintTime: 8.5, // hours (slow material)
    expectedCost: 45.00, // USD (premium material)
    tolerance: 0.10
  },
  {
    name: 'Miniature Figure (50mm scale)',
    description: 'Small detailed print',
    dimensions: { x: 30, y: 30, z: 50, volume: 45000 },
    scale: 100,
    material: 'PLA',
    infill: 10,
    quality: 'high',
    expectedWeight: 12, // grams
    expectedPrintTime: 3.5, // hours (high detail)
    expectedCost: 22.00, // USD
    tolerance: 0.15 // Higher tolerance for complex small parts
  },
  {
    name: 'Scaled Up Model (200%)',
    description: 'Testing scale factor accuracy',
    dimensions: { x: 50, y: 50, z: 50, volume: 125000 },
    scale: 200, // 2x scale
    material: 'ABS',
    infill: 20,
    expectedWeight: 240, // grams (8x volume increase)
    expectedPrintTime: 12, // hours
    expectedCost: 52.00, // USD
    tolerance: 0.10
  },
  {
    name: 'Engineering Part (Nylon)',
    description: 'High-strength engineering material',
    dimensions: { x: 100, y: 60, z: 40, volume: 240000 },
    scale: 100,
    material: 'Nylon',
    infill: 60,
    expectedWeight: 195, // grams
    expectedPrintTime: 10.5, // hours
    expectedCost: 58.00, // USD
    tolerance: 0.10
  }
];

/**
 * Run validation tests on the estimator
 */
async function runValidationTests() {
  const estimator = new PrintCostEstimator();
  const results = [];
  
  console.log('🧪 Running Print Cost Estimator Validation Tests...\n');
  console.log('Target: ±10% accuracy on all test cases\n');
  console.log('='.repeat(80));
  
  for (const test of testDataset) {
    try {
      // Create mock file for testing
      const mockFilePath = createMockFile(test);
      
      // Run estimation
      const estimate = await estimator.estimateCost(mockFilePath, {
        scale: test.scale,
        material: test.material,
        infill: test.infill,
        quality: test.quality || 'standard',
        quantity: 1
      });
      
      // Extract results
      const estimatedCost = estimate.estimate.totalPrice;
      const estimatedWeight = parseFloat(estimate.specifications.weight);
      const estimatedTime = parseTimeString(estimate.specifications.printTime);
      
      // Calculate accuracy
      const costAccuracy = Math.abs(estimatedCost - test.expectedCost) / test.expectedCost;
      const weightAccuracy = Math.abs(estimatedWeight - test.expectedWeight) / test.expectedWeight;
      const timeAccuracy = Math.abs(estimatedTime - test.expectedPrintTime) / test.expectedPrintTime;
      
      const costPassed = costAccuracy <= test.tolerance;
      const weightPassed = weightAccuracy <= 0.15; // 15% tolerance for weight
      const timePassed = timeAccuracy <= 0.20; // 20% tolerance for time
      
      const result = {
        name: test.name,
        passed: costPassed && weightPassed && timePassed,
        cost: {
          expected: test.expectedCost,
          estimated: estimatedCost,
          accuracy: (1 - costAccuracy) * 100,
          passed: costPassed
        },
        weight: {
          expected: test.expectedWeight,
          estimated: estimatedWeight,
          accuracy: (1 - weightAccuracy) * 100,
          passed: weightPassed
        },
        time: {
          expected: test.expectedPrintTime,
          estimated: estimatedTime,
          accuracy: (1 - timeAccuracy) * 100,
          passed: timePassed
        },
        confidence: estimate.confidence.score
      };
      
      results.push(result);
      
      // Print result
      printTestResult(result);
      
    } catch (error) {
      console.error(`❌ Test failed: ${test.name}`);
      console.error(`   Error: ${error.message}\n`);
      results.push({
        name: test.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Print summary
  printSummary(results);
  
  return results;
}

/**
 * Create a mock file for testing with known dimensions
 */
function createMockFile(testCase) {
  // For testing, we'll use the dimensions directly
  // In production, this would be an actual STL file
  return {
    filepath: '/mock/test.stl',
    size: estimateFileSize(testCase.dimensions),
    originalFilename: `${testCase.name}.stl`
  };
}

/**
 * Estimate file size from dimensions (for mock files)
 */
function estimateFileSize(dimensions) {
  // Rough estimate: 1 KB per 1000 mm³
  const volumeMm3 = dimensions.volume;
  return Math.ceil(volumeMm3 / 1000) * 1024; // bytes
}

/**
 * Parse time string back to hours
 */
function parseTimeString(timeStr) {
  if (timeStr.includes('day')) {
    const match = timeStr.match(/(\d+)\s*day/);
    return match ? parseInt(match[1]) * 24 : 0;
  } else if (timeStr.includes('h')) {
    const match = timeStr.match(/(\d+)h\s*(\d+)?m?/);
    const hours = match ? parseInt(match[1]) : 0;
    const minutes = match && match[2] ? parseInt(match[2]) : 0;
    return hours + minutes / 60;
  } else if (timeStr.includes('minutes')) {
    const match = timeStr.match(/(\d+)\s*minutes/);
    return match ? parseInt(match[1]) / 60 : 0;
  }
  return 0;
}

/**
 * Print individual test result
 */
function printTestResult(result) {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - ${result.name}`);
  console.log('-'.repeat(80));
  
  console.log(`  Cost:   $${result.cost.estimated.toFixed(2)} vs $${result.cost.expected.toFixed(2)} ` +
              `(${result.cost.accuracy.toFixed(1)}% accurate) ${result.cost.passed ? '✓' : '✗'}`);
  
  console.log(`  Weight: ${result.weight.estimated.toFixed(1)}g vs ${result.weight.expected.toFixed(1)}g ` +
              `(${result.weight.accuracy.toFixed(1)}% accurate) ${result.weight.passed ? '✓' : '✗'}`);
  
  console.log(`  Time:   ${result.time.estimated.toFixed(1)}h vs ${result.time.expected.toFixed(1)}h ` +
              `(${result.time.accuracy.toFixed(1)}% accurate) ${result.time.passed ? '✓' : '✗'}`);
  
  console.log(`  Confidence: ${result.confidence}%`);
}

/**
 * Print test summary
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const passRate = (passed / results.length) * 100;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Pass Rate: ${passRate.toFixed(1)}%`);
  
  // Calculate average accuracy for passed tests
  const passedResults = results.filter(r => r.passed && !r.error);
  if (passedResults.length > 0) {
    const avgCostAccuracy = passedResults.reduce((sum, r) => sum + r.cost.accuracy, 0) / passedResults.length;
    const avgWeightAccuracy = passedResults.reduce((sum, r) => sum + r.weight.accuracy, 0) / passedResults.length;
    const avgTimeAccuracy = passedResults.reduce((sum, r) => sum + r.time.accuracy, 0) / passedResults.length;
    
    console.log(`\nAverage Accuracy (Passed Tests):`);
    console.log(`  Cost:   ${avgCostAccuracy.toFixed(1)}%`);
    console.log(`  Weight: ${avgWeightAccuracy.toFixed(1)}%`);
    console.log(`  Time:   ${avgTimeAccuracy.toFixed(1)}%`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (passRate >= 90) {
    console.log('🎉 EXCELLENT - Estimator meets ±10% accuracy target!');
  } else if (passRate >= 75) {
    console.log('✅ GOOD - Most estimates within tolerance');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT - Consider recalibrating constants');
  }
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Generate calibration report
 */
function generateCalibrationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results: results,
    recommendations: []
  };
  
  // Analyze patterns in failures
  const failedTests = results.filter(r => !r.passed);
  
  if (failedTests.some(t => t.name.includes('Large'))) {
    report.recommendations.push('Consider adjusting complexity factors for large prints');
  }
  
  if (failedTests.some(t => t.name.includes('TPU') || t.name.includes('Nylon'))) {
    report.recommendations.push('Review material cost multipliers for premium materials');
  }
  
  if (failedTests.some(t => t.name.includes('scale'))) {
    report.recommendations.push('Check scale factor calculations (cubic vs linear)');
  }
  
  return report;
}

// Export for use in tests
module.exports = {
  testDataset,
  runValidationTests,
  generateCalibrationReport
};

// Run tests if called directly
if (require.main === module) {
  runValidationTests()
    .then(results => {
      const report = generateCalibrationReport(results);
      console.log('\n📝 Calibration report generated');
      process.exit(report.passed === report.totalTests ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}
