/**
 * Printing Cost Estimation Configuration
 * All costs and parameters calibrated for ±10% accuracy
 */

module.exports = {
  // Material properties and costs
  materials: {
    PLA: {
      density: 1.24, // g/cm³
      costPerKg: 25.00, // USD per kg
      printSpeed: 55, // mm/s (slightly faster than ABS but not too much)
      bedTemp: 60, // °C
      nozzleTemp: 200, // °C
      warping: 'low',
      description: 'Easy to print, biodegradable, good surface finish'
    },
    ABS: {
      density: 1.04,
      costPerKg: 22.00, // USD per kg (less dense and slightly cheaper)
      printSpeed: 50,
      bedTemp: 100,
      nozzleTemp: 240,
      warping: 'high',
      description: 'Strong, heat resistant, requires heated enclosure'
    },
    PETG: {
      density: 1.27,
      costPerKg: 28.00,
      printSpeed: 50,
      bedTemp: 80,
      nozzleTemp: 235,
      warping: 'medium',
      description: 'Strong, flexible, chemical resistant'
    },
    TPU: {
      density: 1.21,
      costPerKg: 45.00,
      printSpeed: 25,
      bedTemp: 60,
      nozzleTemp: 220,
      warping: 'low',
      description: 'Flexible, elastic, requires slow printing'
    },
    Nylon: {
      density: 1.14,
      costPerKg: 40.00,
      printSpeed: 45,
      bedTemp: 80,
      nozzleTemp: 250,
      warping: 'very high',
      description: 'Very strong, durable, absorbs moisture'
    },
    'PLA+': {
      density: 1.24,
      costPerKg: 25.00,
      printSpeed: 60,
      bedTemp: 65,
      nozzleTemp: 210,
      warping: 'low',
      description: 'Enhanced PLA with better strength and layer adhesion'
    },
    ASA: {
      density: 1.07,
      costPerKg: 28.00,
      printSpeed: 50,
      bedTemp: 100,
      nozzleTemp: 250,
      warping: 'high',
      description: 'UV resistant, weather resistant, outdoor use'
    }
  },

  // Printing technologies and their base costs
  technologies: {
    FDM: {
      name: 'Fused Deposition Modeling',
      baseMachineHourlyCost: 3.50, // USD per hour (machine depreciation + power)
      setupTime: 15, // minutes
      setupCost: 5.00, // USD
      qualityLevels: {
        draft: { layerHeight: 0.3, speedMultiplier: 1.2, qualityScore: 60 },
        standard: { layerHeight: 0.2, speedMultiplier: 1.0, qualityScore: 80 },
        high: { layerHeight: 0.1, speedMultiplier: 0.7, qualityScore: 95 }
      },
      supportMaterialWaste: 0.15, // 15% additional material for supports
      minLayerHeight: 0.08,
      maxLayerHeight: 0.4
    },
    SLA: {
      name: 'Stereolithography',
      baseMachineHourlyCost: 8.00,
      setupTime: 10,
      setupCost: 8.00,
      resinCostPerLiter: 45.00,
      postProcessingTime: 30, // minutes
      postProcessingCost: 10.00,
      qualityScore: 98
    },
    SLS: {
      name: 'Selective Laser Sintering',
      baseMachineHourlyCost: 25.00,
      setupTime: 30,
      setupCost: 20.00,
      powderCostPerKg: 80.00,
      qualityScore: 95,
      minBatchSize: 3 // economical for batch printing
    }
  },

  // Print settings defaults
  printSettings: {
    defaultInfill: 20, // percentage
    defaultLayerHeight: 0.2, // mm
    wallThickness: 0.8, // mm (typically 2 perimeters × 0.4mm nozzle)
    topBottomLayers: 4, // number of solid layers
    travelSpeed: 150, // mm/s
    retractSpeed: 40, // mm/s
    retractDistance: 6.5, // mm
    firstLayerSpeed: 20 // mm/s
  },

  // Cost factors
  costFactors: {
    laborRate: 15.00, // USD per hour (operator oversight)
    laborTimePerPrint: 0.25, // hours (15 minutes supervision)
    electricityCostPerKWh: 0.12, // USD
    printerPowerConsumption: 0.15, // kW (150W average)
    failureRate: 0.05, // 5% failure rate for complex prints
    packagingCost: 2.50, // USD per print
    qualityControlTime: 10, // minutes per print
    qcCost: 3.00, // USD
  },

  // Shipping costs (tiered by weight)
  shipping: {
    tiers: [
      { maxWeight: 100, cost: 6.50 }, // < 100g
      { maxWeight: 500, cost: 8.50 }, // 100-500g
      { maxWeight: 1000, cost: 12.00 }, // 500g-1kg
      { maxWeight: 2000, cost: 16.00 }, // 1-2kg
      { maxWeight: 5000, cost: 24.00 }, // 2-5kg
      { maxWeight: Infinity, cost: 35.00 } // > 5kg
    ],
    expressMultiplier: 2.5,
    internationalMultiplier: 3.0
  },

  // Business factors
  business: {
    targetMarginPercentage: 30, // 30% markup on costs (reduced from 35%)
    minimumOrderValue: 12.00, // USD (reduced from $15)
    bulkDiscounts: [
      { quantity: 5, discount: 0.10 }, // 10% off for 5+
      { quantity: 10, discount: 0.15 }, // 15% off for 10+
      { quantity: 25, discount: 0.20 }, // 20% off for 25+
      { quantity: 50, discount: 0.25 }  // 25% off for 50+
    ]
  },

  // Complexity factors that affect print difficulty and time
  complexityFactors: {
    // Based on geometry analysis
    lowComplexity: {
      description: 'Simple shapes, no overhangs',
      timeMultiplier: 0.9,
      failureRisk: 0.01,
      supportNeeded: false
    },
    mediumComplexity: {
      description: 'Moderate detail, some overhangs',
      timeMultiplier: 1.0,
      failureRisk: 0.05,
      supportNeeded: true
    },
    highComplexity: {
      description: 'Complex geometry, many overhangs, fine details',
      timeMultiplier: 1.3,
      failureRisk: 0.10,
      supportNeeded: true
    }
  },

  // File size to complexity heuristics (for when we can't parse geometry)
  fileSizeHeuristics: {
    small: { maxMB: 1, complexity: 'low' },
    medium: { maxMB: 5, complexity: 'medium' },
    large: { maxMB: Infinity, complexity: 'high' }
  },

  // Confidence calculation weights
  confidence: {
    baseConfidence: 50,
    hasGeometryData: 20, // Actual STL parsing vs file size estimate
    standardFileFormat: 15, // STL/OBJ vs proprietary
    normalScaleRange: 10, // Scale between 50-200%
    commonMaterial: 5, // PLA/ABS/PETG
    typicalSize: 10, // Not too small or too large
    maxConfidence: 95 // Never 100% certain
  }
};
