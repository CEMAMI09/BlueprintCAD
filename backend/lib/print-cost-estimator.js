/**
 * Advanced Print Cost Estimator
 * Physics-based calculations for accurate cost estimation (±10% target)
 */

const config = require('./print-cost-config');
const { getSTLDimensions, calculateWeight, calculatePrintTime } = require('./stl-utils');
const fs = require('fs');
const path = require('path');

class PrintCostEstimator {
  constructor() {
    this.config = config;
  }

  /**
   * Main estimation function
   * @param {string} filePath - Path to the 3D model file
   * @param {object} options - Printing options
   * @returns {object} Detailed cost breakdown
   */
  async estimateCost(filePath, options = {}) {
    const {
      scale = 100,
      material = 'PLA',
      technology = 'FDM',
      quality = 'standard',
      infill = config.printSettings.defaultInfill,
      quantity = 1,
      shipping = 'standard'
    } = options;

    try {
      // Get file metadata
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const fileExtension = path.extname(filePath).toLowerCase().replace('.', '');

      // Try to extract actual geometry data
      let dimensions = null;
      let hasGeometryData = false;

      if (fileExtension === 'stl') {
        dimensions = getSTLDimensions(filePath);
        hasGeometryData = !!dimensions;
      }

      // Fallback to heuristic if we can't parse geometry
      if (!dimensions) {
        dimensions = this.estimateDimensionsFromFileSize(fileSizeMB, scale);
      }

      // Calculate material properties
      const materialConfig = config.materials[material] || config.materials.PLA;
      const techConfig = config.technologies[technology];
      const qualityConfig = techConfig.qualityLevels?.[quality] || techConfig.qualityLevels?.standard;

      // Calculate scaled dimensions
      const scaleFactor = scale / 100;
      const scaledDimensions = {
        x: dimensions.x * scaleFactor,
        y: dimensions.y * scaleFactor,
        z: dimensions.z * scaleFactor,
        volume: dimensions.volume * Math.pow(scaleFactor, 3)
      };

      // Determine complexity
      const complexity = this.analyzeComplexity(dimensions, fileSizeMB, hasGeometryData);

      // Calculate weight
      const weight = this.calculateAccurateWeight(
        scaledDimensions,
        materialConfig,
        infill,
        complexity.supportNeeded
      );

      // Calculate print time
      const layerHeight = qualityConfig?.layerHeight || config.printSettings.defaultLayerHeight;
      const printSpeed = materialConfig.printSpeed * (qualityConfig?.speedMultiplier || 1.0);
      
      const printTime = this.calculateAccuratePrintTime(
        scaledDimensions,
        layerHeight,
        printSpeed,
        complexity,
        technology
      );

      // Calculate costs
      const costs = this.calculateDetailedCosts(
        weight,
        printTime,
        materialConfig,
        techConfig,
        complexity,
        quantity
      );

      // Calculate shipping
      const shippingCost = this.calculateShipping(weight * quantity, shipping);

      // Calculate confidence
      const confidence = this.calculateConfidence(
        hasGeometryData,
        fileExtension,
        scale,
        material,
        scaledDimensions
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        scaledDimensions,
        material,
        complexity,
        weight,
        printTime
      );

      // Build response
      const subtotal = costs.total * quantity;
      const markup = subtotal * config.business.targetMarginPercentage / 100;
      const discount = this.calculateBulkDiscount(quantity);
      const discountAmount = (subtotal + markup) * discount;
      const totalBeforeShipping = subtotal + markup - discountAmount;
      const grandTotal = Math.max(totalBeforeShipping + shippingCost, config.business.minimumOrderValue);

      return {
        success: true,
        estimate: {
          totalPrice: grandTotal,
          currency: 'USD',
          pricePerUnit: (totalBeforeShipping / quantity),
          quantity: quantity
        },
        breakdown: {
          material: costs.material,
          machineTime: costs.machineTime,
          labor: costs.labor,
          setup: costs.setup,
          overhead: costs.overhead,
          qualityControl: costs.qualityControl,
          packaging: costs.packaging,
          subtotal: costs.total,
          markup: markup,
          discount: discountAmount,
          shipping: shippingCost
        },
        specifications: {
          material: material,
          technology: technology,
          quality: quality,
          infill: `${infill}%`,
          layerHeight: `${layerHeight}mm`,
          weight: `${weight.toFixed(1)}g`,
          dimensions: {
            x: `${scaledDimensions.x.toFixed(1)}mm`,
            y: `${scaledDimensions.y.toFixed(1)}mm`,
            z: `${scaledDimensions.z.toFixed(1)}mm`
          },
          printTime: this.formatTime(printTime),
          complexity: complexity.level
        },
        confidence: {
          score: confidence,
          description: this.getConfidenceDescription(confidence),
          hasGeometryData: hasGeometryData
        },
        recommendations: recommendations,
        manufacturingOptions: this.getManufacturingOptions(grandTotal, printTime)
      };

    } catch (error) {
      console.error('Cost estimation error:', error);
      throw error;
    }
  }

  /**
   * Calculate accurate weight including shell, infill, and supports
   */
  calculateAccurateWeight(dimensions, materialConfig, infill, needsSupport) {
    const volumeMm3 = dimensions.volume;
    const volumeCm3 = volumeMm3 / 1000;

    // Calculate shell volume (walls + top/bottom)
    const wallVolumeFraction = 0.15; // ~15% of bounding box is shell

    // Calculate infill volume
    const infillVolumeFraction = (infill / 100) * 0.85; // 85% of interior can have infill

    // Total effective volume fraction
    let effectiveVolumeFraction = wallVolumeFraction + infillVolumeFraction;

    // Add support material if needed
    if (needsSupport) {
      effectiveVolumeFraction += config.technologies.FDM.supportMaterialWaste;
    }

    // Calculate weight
    const weight = volumeCm3 * materialConfig.density * effectiveVolumeFraction;

    return weight;
  }

  /**
   * Calculate accurate print time with proper overhead
   */
  calculateAccuratePrintTime(dimensions, layerHeight, printSpeed, complexity, technology) {
    const layers = Math.ceil(dimensions.z / layerHeight);
    
    // Estimate perimeter length per layer (rough approximation)
    const avgPerimeterLength = 2 * (dimensions.x + dimensions.y);
    
    // Estimate infill path length per layer
    const layerArea = dimensions.x * dimensions.y;
    const infillDensity = config.printSettings.defaultInfill / 100;
    const infillSpacing = 2; // mm between infill lines
    const infillPathLength = (layerArea * infillDensity) / infillSpacing;
    
    // Total extrusion path length
    const pathLengthPerLayer = avgPerimeterLength * 2 + infillPathLength; // 2 perimeters
    const totalPathLength = pathLengthPerLayer * layers;
    
    // Calculate print time
    const printTimeSeconds = totalPathLength / printSpeed;
    
    // Add overhead
    const firstLayerTime = avgPerimeterLength / config.printSettings.firstLayerSpeed;
    const travelTime = totalPathLength * 0.3 / config.printSettings.travelSpeed; // 30% of path is travel
    const retractTime = layers * 2; // 2 seconds per layer for retractions
    
    // Total time in hours
    let totalTimeHours = (printTimeSeconds + firstLayerTime + travelTime + retractTime) / 3600;
    
    // Apply complexity multiplier
    totalTimeHours *= complexity.timeMultiplier;
    
    // Add setup time
    const techConfig = config.technologies[technology];
    totalTimeHours += techConfig.setupTime / 60;
    
    return totalTimeHours;
  }

  /**
   * Calculate detailed cost breakdown
   */
  calculateDetailedCosts(weight, printTime, materialConfig, techConfig, complexity, quantity) {
    // Material cost
    const materialCost = (weight / 1000) * materialConfig.costPerKg;
    
    // Machine time cost (includes power)
    const machineTimeCost = printTime * techConfig.baseMachineHourlyCost;
    
    // Labor cost
    const laborTime = config.costFactors.laborTimePerPrint;
    const laborCost = laborTime * config.costFactors.laborRate;
    
    // Setup cost (amortized for quantity)
    const setupCost = techConfig.setupCost / Math.min(quantity, 10);
    
    // Failure risk overhead
    const failureRiskCost = (materialCost + machineTimeCost) * complexity.failureRisk;
    
    // Quality control
    const qcCost = config.costFactors.qcCost;
    
    // Packaging
    const packagingCost = config.costFactors.packagingCost;
    
    // Total overhead (electricity, facility, etc.)
    const overheadCost = printTime * config.costFactors.electricityCostPerKWh * config.costFactors.printerPowerConsumption;
    
    const total = materialCost + machineTimeCost + laborCost + setupCost + 
                  failureRiskCost + qcCost + packagingCost + overheadCost;
    
    return {
      material: materialCost,
      machineTime: machineTimeCost,
      labor: laborCost,
      setup: setupCost,
      overhead: overheadCost + failureRiskCost,
      qualityControl: qcCost,
      packaging: packagingCost,
      total: total
    };
  }

  /**
   * Analyze print complexity from geometry or file size
   */
  analyzeComplexity(dimensions, fileSizeMB, hasGeometryData) {
    let complexityLevel;
    
    if (hasGeometryData) {
      // Analyze based on actual dimensions
      const aspectRatio = Math.max(dimensions.x, dimensions.y) / dimensions.z;
      const surfaceToVolume = ((dimensions.x * dimensions.y * 2) + 
                               (dimensions.x * dimensions.z * 2) + 
                               (dimensions.y * dimensions.z * 2)) / dimensions.volume;
      
      if (aspectRatio < 2 && surfaceToVolume < 0.5) {
        complexityLevel = 'low';
      } else if (aspectRatio < 5 && surfaceToVolume < 1.0) {
        complexityLevel = 'medium';
      } else {
        complexityLevel = 'high';
      }
    } else {
      // Use file size heuristic
      if (fileSizeMB < config.fileSizeHeuristics.small.maxMB) {
        complexityLevel = config.fileSizeHeuristics.small.complexity;
      } else if (fileSizeMB < config.fileSizeHeuristics.medium.maxMB) {
        complexityLevel = config.fileSizeHeuristics.medium.complexity;
      } else {
        complexityLevel = config.fileSizeHeuristics.large.complexity;
      }
    }
    
    const complexityData = config.complexityFactors[complexityLevel + 'Complexity'];
    return {
      level: complexityLevel,
      ...complexityData
    };
  }

  /**
   * Estimate dimensions from file size (fallback method)
   */
  estimateDimensionsFromFileSize(fileSizeMB, scale) {
    // Rough heuristic: 1 MB ≈ 50mm cube of medium detail
    const estimatedVolume = fileSizeMB * 125000; // mm³
    const cubeRoot = Math.cbrt(estimatedVolume);
    
    return {
      x: cubeRoot,
      y: cubeRoot,
      z: cubeRoot,
      volume: estimatedVolume
    };
  }

  /**
   * Calculate shipping cost based on weight
   */
  calculateShipping(totalWeight, shippingType) {
    const tier = config.shipping.tiers.find(t => totalWeight <= t.maxWeight);
    let cost = tier ? tier.cost : config.shipping.tiers[config.shipping.tiers.length - 1].cost;
    
    if (shippingType === 'express') {
      cost *= config.shipping.expressMultiplier;
    } else if (shippingType === 'international') {
      cost *= config.shipping.internationalMultiplier;
    }
    
    return cost;
  }

  /**
   * Calculate bulk discount
   */
  calculateBulkDiscount(quantity) {
    const applicableDiscount = config.business.bulkDiscounts
      .filter(d => quantity >= d.quantity)
      .sort((a, b) => b.discount - a.discount)[0];
    
    return applicableDiscount ? applicableDiscount.discount : 0;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(hasGeometryData, fileExtension, scale, material, dimensions) {
    let confidence = config.confidence.baseConfidence;
    
    if (hasGeometryData) {
      confidence += config.confidence.hasGeometryData;
    }
    
    if (['stl', 'obj', 'step', 'stp'].includes(fileExtension)) {
      confidence += config.confidence.standardFileFormat;
    }
    
    if (scale >= 50 && scale <= 200) {
      confidence += config.confidence.normalScaleRange;
    }
    
    if (['PLA', 'ABS', 'PETG'].includes(material)) {
      confidence += config.confidence.commonMaterial;
    }
    
    const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);
    if (maxDimension > 10 && maxDimension < 300) {
      confidence += config.confidence.typicalSize;
    }
    
    return Math.min(confidence, config.confidence.maxConfidence);
  }

  /**
   * Get confidence description
   */
  getConfidenceDescription(score) {
    if (score >= 85) return 'Very High - Based on accurate geometry analysis';
    if (score >= 70) return 'High - Reliable estimate with good data';
    if (score >= 55) return 'Medium - Estimate based on file characteristics';
    return 'Low - Limited data, use as rough approximation';
  }

  /**
   * Generate smart recommendations
   */
  generateRecommendations(dimensions, material, complexity, weight, printTime) {
    const recommendations = [];
    
    // Size recommendations
    const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z);
    if (maxDim > 200) {
      recommendations.push({
        type: 'size',
        priority: 'high',
        message: 'Large print detected - Consider splitting into multiple parts for reliability'
      });
    }
    
    // Complexity recommendations
    if (complexity.level === 'high') {
      recommendations.push({
        type: 'complexity',
        priority: 'medium',
        message: 'Complex geometry detected - Recommend using supports and slower print speed'
      });
    }
    
    // Material recommendations
    const materialConfig = config.materials[material];
    if (materialConfig.warping === 'high' || materialConfig.warping === 'very high') {
      recommendations.push({
        type: 'material',
        priority: 'high',
        message: `${material} requires heated bed and enclosure to prevent warping`
      });
    }
    
    // Print time recommendations
    if (printTime > 12) {
      recommendations.push({
        type: 'time',
        priority: 'medium',
        message: 'Long print time - Consider higher layer height for faster printing'
      });
    }
    
    // Weight recommendations
    if (weight > 500) {
      recommendations.push({
        type: 'weight',
        priority: 'low',
        message: 'Heavy print - Ensure bed adhesion is optimal to prevent detachment'
      });
    }
    
    // Orientation
    recommendations.push({
      type: 'orientation',
      priority: 'medium',
      message: 'Optimize print orientation to minimize support material and maximize strength'
    });
    
    return recommendations;
  }

  /**
   * Get manufacturing options
   */
  getManufacturingOptions(basePrice, printTime) {
    return [
      {
        name: 'Blueprint Manufacturing',
        price: basePrice,
        deliveryTime: this.estimateDeliveryTime(printTime),
        description: 'Professional manufacturing with quality guarantee',
        features: ['Quality inspected', 'Professional finish', 'Guaranteed delivery'],
        recommended: true
      },
      {
        name: 'Express Service',
        price: basePrice * 1.5,
        deliveryTime: this.estimateDeliveryTime(printTime / 2),
        description: 'Priority printing and expedited shipping',
        features: ['Rush processing', '2x print speed', 'Express shipping']
      },
      {
        name: 'DIY Quote',
        estimatedCost: basePrice * 0.4,
        description: 'Estimated cost for self-printing (material + power only)',
        disclaimer: 'Requires access to 3D printer and expertise'
      }
    ];
  }

  /**
   * Estimate delivery time
   */
  estimateDeliveryTime(printTimeHours) {
    const productionDays = Math.ceil(printTimeHours / 8); // 8 hour workday
    const shippingDays = 3; // Standard shipping
    const bufferDays = 1; // Quality control and packaging
    
    const totalDays = productionDays + shippingDays + bufferDays;
    
    if (totalDays <= 3) return '2-3 days';
    if (totalDays <= 5) return '3-5 days';
    if (totalDays <= 7) return '5-7 days';
    if (totalDays <= 10) return '7-10 days';
    return `${totalDays} days`;
  }

  /**
   * Format time in human-readable format
   */
  formatTime(hours) {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const h = Math.round(hours % 24);
      return `${days} day${days > 1 ? 's' : ''} ${h}h`;
    }
  }
}

module.exports = PrintCostEstimator;
