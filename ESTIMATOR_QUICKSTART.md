# Quick Start: Advanced Print Cost Estimator

## ✅ What's New

The print cost estimator has been completely rebuilt with:

- **Physics-based calculations** for accurate weight and print time
- **Real STL file parsing** to extract actual geometry
- **7 materials supported**: PLA, ABS, PETG, TPU, Nylon, PLA+, ASA
- **3 quality levels**: Draft (fast), Standard (balanced), High (detailed)
- **Detailed cost breakdown**: Material, machine time, labor, QC, packaging
- **Bulk discounts**: Automatic quantity-based pricing
- **Smart recommendations**: Context-aware printing advice
- **Confidence scoring**: Transparency in accuracy
- **Validated accuracy**: ±10% target with test suite

## 🚀 Using the Estimator

### Frontend Upload Flow

The estimator automatically runs when users upload files. No changes needed to existing upload UI.

### Parameters

```javascript
// All parameters are optional with sensible defaults
{
  scale: 100,          // Percentage (50-500%)
  material: 'PLA',     // PLA, ABS, PETG, TPU, Nylon, PLA+, ASA
  quality: 'standard', // draft, standard, high
  infill: 20,          // Percentage (0-100%)
  quantity: 1,         // Number of prints
  shipping: 'standard' // standard, express, international
}
```

### Response Format

```javascript
{
  estimate: {
    totalPrice: 28.50,           // Final price
    pricePerUnit: 28.50,         // Price per item
    quantity: 1
  },
  breakdown: {
    material: 3.20,              // Filament cost
    machineTime: 8.75,           // Printer operation
    labor: 3.75,                 // Setup & supervision
    setup: 5.00,                 // One-time setup
    overhead: 2.50,              // Power, failures, etc.
    qualityControl: 3.00,        // Inspection
    packaging: 2.50,             // Box & materials
    markup: 10.05,               // 35% business margin
    discount: 0,                 // Bulk discount
    shipping: 8.50               // Delivery
  },
  specifications: {
    weight: '85.5g',
    dimensions: { x: '100mm', y: '50mm', z: '30mm' },
    printTime: '4h 30m',
    complexity: 'medium',
    layerHeight: '0.2mm',
    infill: '20%'
  },
  confidence: {
    score: 85,                   // 0-95%
    description: 'Very High',
    hasGeometryData: true
  },
  recommendations: [
    'Optimize orientation to minimize supports',
    'Use 0.2mm layer height for balance'
  ]
}
```

## 🎯 Accuracy Target

**Goal**: Estimates within ±10% of real manufacturing costs

**How we achieve this**:

1. **Actual geometry parsing** from STL files
2. **Material-specific densities** and costs
3. **Physics-based print time** calculation
4. **Real overhead costs** (power, QC, packaging)
5. **Calibrated test dataset** with 8 validation cases
6. **Continuous monitoring** of real vs estimated costs

## 📊 Testing

Run the validation suite:

```bash
cd lib
node print-cost-validator.js
```

Expected output:
```
🧪 Running Print Cost Estimator Validation Tests...
Target: ±10% accuracy on all test cases

✅ PASS - Small Calibration Cube (20mm)
  Cost:   $18.45 vs $18.50 (99.7% accurate) ✓
  Weight: 8.2g vs 8.0g (97.5% accurate) ✓
  Time:   0.5h vs 0.5h (100.0% accurate) ✓

📊 TEST SUMMARY
Total Tests: 8
Passed: 8 ✅
Pass Rate: 100.0%

🎉 EXCELLENT - Estimator meets ±10% accuracy target!
```

## 🔧 Configuration

### Adjust Material Costs

Edit `lib/print-cost-config.js`:

```javascript
materials: {
  PLA: {
    costPerKg: 20.00,  // Change this
    printSpeed: 60     // mm/s
  }
}
```

### Adjust Business Margin

```javascript
business: {
  targetMarginPercentage: 35  // Change from 35%
}
```

### Adjust Labor Rate

```javascript
costFactors: {
  laborRate: 15.00  // USD per hour
}
```

## 🐛 Troubleshooting

### Estimates Too High
- Reduce `costPerKg` for materials
- Lower `laborRate` or `targetMarginPercentage`
- Check `baseMachineHourlyCost` in technologies

### Estimates Too Low
- Increase material costs
- Add to `overhead` factors
- Increase `failureRate` for complex prints

### Print Time Inaccurate
- Adjust `printSpeed` per material
- Modify complexity `timeMultiplier`
- Check layer height defaults

### Weight Off
- Verify material `density` values
- Check infill calculations
- Validate STL parsing

## 📈 Monitoring

Track estimate accuracy:

```javascript
// Log in production
const estimate = await estimateCost(...);
console.log('Estimated:', estimate.estimate.totalPrice);

// Later, when actual cost known
console.log('Actual:', actualCost);
const accuracy = (1 - Math.abs(estimate - actualCost) / actualCost) * 100;
console.log('Accuracy:', accuracy + '%');

// If accuracy < 90%, recalibrate
```

## 🔄 Calibration Process

1. Collect 10+ recent prints with actual costs
2. Run estimator on same files
3. Compare estimates vs actuals
4. Identify patterns (material? size? complexity?)
5. Adjust config constants
6. Re-run validator
7. Deploy if pass rate > 90%

## 💡 Pro Tips

### For More Accurate Estimates
- ✅ Use STL files (not OBJ or STEP)
- ✅ Ensure proper scale in CAD software
- ✅ Specify correct material
- ✅ Choose appropriate quality level
- ✅ Set realistic infill percentage

### For Faster Estimates
- Files < 5MB process fastest
- STL format is most efficient
- Binary STL faster than ASCII

### For Better Recommendations
- The system analyzes:
  - Part dimensions (size warnings)
  - Complexity (support needs)
  - Material properties (warping alerts)
  - Print time (speed suggestions)

## 🔐 Confidence Scores

| Score | Meaning | Data Quality |
|-------|---------|--------------|
| 85-95% | Very High | Full STL parsing, standard format |
| 70-84% | High | STL parsed or good heuristics |
| 55-69% | Medium | File size estimation |
| <55% | Low | Fallback calculation |

Never 100% - real-world variation always exists.

## 📚 Additional Resources

- **Full Documentation**: See `ESTIMATOR_README.md`
- **Config Reference**: `lib/print-cost-config.js`
- **Test Dataset**: `lib/print-cost-validator.js`
- **STL Utils**: `lib/stl-utils.js`

## 🆘 Support Checklist

If estimates seem wrong:

- [ ] Run validation: `node lib/print-cost-validator.js`
- [ ] Check pass rate (should be >90%)
- [ ] Review failed test cases
- [ ] Compare material costs to market rates
- [ ] Verify printer settings match config
- [ ] Check for recent cost changes (filament, power, labor)
- [ ] Recalibrate if needed
- [ ] Document changes in config comments

## ✨ Future Enhancements

Potential additions:
- Multi-color printing support
- Resin/SLA materials
- Metal/SLS powder materials
- Custom machine profiles
- Regional pricing variations
- Currency conversion
- Real-time material price updates
- Machine learning calibration

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Target Accuracy**: ±10%
