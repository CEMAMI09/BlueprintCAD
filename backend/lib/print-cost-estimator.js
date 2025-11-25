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
      console.log(`[Cost Estimator] Using material: ${material}, Config:`, {
        density: materialConfig.density,
        costPerKg: materialConfig.costPerKg,
        printSpeed: materialConfig.printSpeed
      });
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
      
      // Validate dimensions are reasonable (catch unit conversion errors)
      const maxDim = Math.max(scaledDimensions.x, scaledDimensions.y, scaledDimensions.z);
      if (maxDim > 10000) {
        console.warn(`[Cost Estimator] Suspiciously large dimensions detected (${maxDim.toFixed(2)}mm). Possible unit conversion error.`);
      }
      if (scaledDimensions.volume < 0 || scaledDimensions.volume > 1e12) {
        console.warn(`[Cost Estimator] Suspicious volume detected (${scaledDimensions.volume.toFixed(2)}mm³). Possible calculation error.`);
      }
      
      console.log(`[Cost Estimator] Scaled dimensions: ${scaledDimensions.x.toFixed(2)} x ${scaledDimensions.y.toFixed(2)} x ${scaledDimensions.z.toFixed(2)} mm, Volume: ${scaledDimensions.volume.toFixed(4)} mm³ (${(scaledDimensions.volume/1000).toFixed(6)} cm³)`);

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
      // For very small objects, reduce fixed costs proportionally
      const maxDimension = Math.max(scaledDimensions.x, scaledDimensions.y, scaledDimensions.z);
      const volumeCm3 = scaledDimensions.volume / 1000;
      const isMicroObject = maxDimension < 5 || volumeCm3 < 0.1; // Less than 5mm or 0.1cm³
      const isSmallObject = maxDimension < 100 && volumeCm3 < 500; // Less than 100mm or 500cm³
      
      let adjustedCosts = costs;
      if (isMicroObject) {
        // For micro objects, reduce labor and setup costs significantly
        // They take less time to handle and can be batched
        const microMultiplier = Math.max(0.2, Math.min(1.0, Math.max(maxDimension / 5, volumeCm3 * 20))); // Scale from 20% to 100%
        adjustedCosts = {
          material: costs.material,
          machineTime: costs.machineTime,
          labor: costs.labor * microMultiplier,
          setup: costs.setup * microMultiplier,
          overhead: costs.overhead * 0.4, // Much less overhead for tiny objects
          qualityControl: costs.qualityControl * microMultiplier,
          packaging: costs.packaging * 0.3, // Much smaller packaging
          total: costs.material + costs.machineTime + 
                 (costs.labor * microMultiplier) + 
                 (costs.setup * microMultiplier) +
                 (costs.overhead * 0.4) +
                 (costs.qualityControl * microMultiplier) +
                 (costs.packaging * 0.3)
        };
        console.log(`[Cost Estimator] Micro object detected (${maxDimension.toFixed(2)}mm max, ${volumeCm3.toFixed(6)}cm³). Applying micro multiplier: ${microMultiplier.toFixed(2)}`);
        console.log(`[Cost Estimator] Original total: $${costs.total.toFixed(4)}, Adjusted total: $${adjustedCosts.total.toFixed(4)}`);
      } else if (isSmallObject) {
        // For small/medium objects (like 60mm cubes), reduce fixed costs more aggressively
        // Scale reductions based on size - smaller objects get bigger discounts
        // For 60mm objects, multiplier should be around 0.6 (60% of costs)
        const sizeMultiplier = Math.max(0.3, Math.min(0.7, maxDimension / 100)); // 30-70% based on size
        adjustedCosts = {
          material: costs.material,
          machineTime: costs.machineTime,
          labor: costs.labor * sizeMultiplier, // 30-70% reduction for small objects
          setup: costs.setup * sizeMultiplier,
          overhead: costs.overhead * 0.5, // 50% reduction for small objects
          qualityControl: costs.qualityControl * sizeMultiplier,
          packaging: costs.packaging * 0.5, // 50% reduction for small objects
          total: costs.material + costs.machineTime + 
                 (costs.labor * sizeMultiplier) + 
                 (costs.setup * sizeMultiplier) +
                 (costs.overhead * 0.5) +
                 (costs.qualityControl * sizeMultiplier) +
                 (costs.packaging * 0.5)
        };
        console.log(`[Cost Estimator] Small object detected (${maxDimension.toFixed(2)}mm max, ${volumeCm3.toFixed(2)}cm³). Applying small object discounts with multiplier: ${sizeMultiplier.toFixed(2)}`);
        console.log(`[Cost Estimator] Original total: $${costs.total.toFixed(2)}, Adjusted total: $${adjustedCosts.total.toFixed(2)}`);
      }
      
      const subtotal = adjustedCosts.total * quantity;
      const markup = subtotal * config.business.targetMarginPercentage / 100;
      const discount = this.calculateBulkDiscount(quantity);
      const discountAmount = (subtotal + markup) * discount;
      const totalBeforeShipping = subtotal + markup - discountAmount;
      
      // For micro objects, use a lower minimum order value (but not less than $5)
      // For small objects, don't force minimum if calculated is reasonable
      let effectiveMinimum = config.business.minimumOrderValue;
      if (isMicroObject) {
        effectiveMinimum = Math.max(5.00, Math.min(15.00, totalBeforeShipping * 1.1));
      } else if (isSmallObject) {
        // For small objects, use a lower minimum (don't force $12 if calculated is lower)
        effectiveMinimum = Math.max(8.00, totalBeforeShipping * 0.95); // Allow prices down to $8 for small objects
      }
      let grandTotal = Math.max(totalBeforeShipping + shippingCost, effectiveMinimum);
      
      // Safety cap: For small objects, never exceed $50 (should be much lower, but prevents runaway calculations)
      if (isSmallObject && grandTotal > 50.00) {
        console.warn(`[Cost Estimator] Small object total exceeded $50 ($${grandTotal.toFixed(2)}), capping at $50. Check print time calculation.`);
        grandTotal = 50.00;
      }
      
      console.log(`[Cost Estimator] Final calculation: Subtotal=$${subtotal.toFixed(2)}, Markup=$${markup.toFixed(2)}, Shipping=$${shippingCost.toFixed(2)}, Total=$${grandTotal.toFixed(2)}`);

      return {
        success: true,
        estimate: {
          totalPrice: grandTotal,
          currency: 'USD',
          pricePerUnit: (totalBeforeShipping / quantity),
          quantity: quantity
        },
        breakdown: {
          material: adjustedCosts.material,
          machineTime: adjustedCosts.machineTime,
          labor: adjustedCosts.labor,
          setup: adjustedCosts.setup,
          overhead: adjustedCosts.overhead,
          qualityControl: adjustedCosts.qualityControl,
          packaging: adjustedCosts.packaging,
          subtotal: adjustedCosts.total,
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

    console.log(`[Weight Calculation] Volume: ${volumeMm3.toFixed(2)} mm³ = ${volumeCm3.toFixed(4)} cm³`);

    // Calculate shell volume (walls + top/bottom)
    // For a typical print: 2-3 perimeters (0.4mm nozzle) = ~0.8-1.2mm walls
    // Top/bottom layers: typically 4-6 layers at 0.2mm = 0.8-1.2mm
    // Shell typically represents 10-20% of bounding box volume
    const wallVolumeFraction = 0.12; // ~12% of bounding box is shell (reduced from 15%)

    // Calculate infill volume
    // Infill only applies to the interior (not the shell area)
    // Interior volume = 100% - shell% = ~88%
    // Infill density applies to that interior
    const interiorVolumeFraction = 1.0 - wallVolumeFraction; // ~88% is interior
    const infillVolumeFraction = (infill / 100) * interiorVolumeFraction; // Infill applies to interior

    // Total effective volume fraction
    let effectiveVolumeFraction = wallVolumeFraction + infillVolumeFraction;

    // Add support material if needed
    if (needsSupport) {
      effectiveVolumeFraction += config.technologies.FDM.supportMaterialWaste;
    }

    // Calculate weight
    const weight = volumeCm3 * materialConfig.density * effectiveVolumeFraction;

    console.log(`[Weight Calculation] Shell: ${(wallVolumeFraction * 100).toFixed(1)}%, Infill: ${(infillVolumeFraction * 100).toFixed(1)}%, Effective: ${(effectiveVolumeFraction * 100).toFixed(1)}%, Density: ${materialConfig.density} g/cm³, Weight: ${weight.toFixed(2)}g`);

    return weight;
  }

  /**
   * Calculate accurate print time with proper overhead
   */
  calculateAccuratePrintTime(dimensions, layerHeight, printSpeed, complexity, technology) {
    // For very small objects, use a more accurate calculation
    const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);
    const isMicroObject = maxDimension < 5;
    
    const layers = Math.max(1, Math.ceil(dimensions.z / layerHeight));
    
    // Estimate perimeter length per layer (rough approximation)
    const avgPerimeterLength = 2 * (dimensions.x + dimensions.y);
    
    // Estimate infill path length per layer
    const layerArea = dimensions.x * dimensions.y;
    const infillDensity = config.printSettings.defaultInfill / 100;
    const infillSpacing = 2; // mm between infill lines
    const infillPathLength = (layerArea * infillDensity) / infillSpacing;
    
    // Total extrusion path length
    // Use 2 perimeters for outer walls, but reduce infill calculation for efficiency
    const pathLengthPerLayer = avgPerimeterLength * 2 + (infillPathLength * 0.7); // Slightly reduce infill estimate
    const totalPathLength = pathLengthPerLayer * layers;
    
    // Calculate print time (account for acceleration/deceleration)
    // Real printers don't run at full speed constantly, so add efficiency factor
    const efficiencyFactor = 0.80; // 80% efficiency (improved from 75%)
    const printTimeSeconds = (totalPathLength / printSpeed) / efficiencyFactor;
    
    // Add overhead
    const firstLayerTime = avgPerimeterLength / config.printSettings.firstLayerSpeed;
    const travelTime = totalPathLength * 0.20 / config.printSettings.travelSpeed; // 20% of path is travel (reduced from 25%)
    const retractTime = layers * 1.0; // 1 second per layer (reduced from 1.5)
    
    // Total time in hours
    let totalTimeHours = (printTimeSeconds + firstLayerTime + travelTime + retractTime) / 3600;
    
    console.log(`[Cost Estimator] Print time calculation: ${layers} layers, ${totalPathLength.toFixed(0)}mm path, ${totalTimeHours.toFixed(3)}h total`);
    
    // For micro objects, reduce complexity multiplier impact
    // For small objects, also reduce complexity penalty
    if (isMicroObject) {
      totalTimeHours *= Math.max(0.7, complexity.timeMultiplier * 0.8); // Less complexity penalty for tiny objects
    } else if (maxDimension < 100) {
      // For small objects (< 100mm), reduce complexity multiplier
      totalTimeHours *= Math.max(0.8, complexity.timeMultiplier * 0.9); // Less penalty for small objects
    } else {
      totalTimeHours *= complexity.timeMultiplier;
    }
    
    // Add setup time (but less for micro objects that can be batched)
    const techConfig = config.technologies[technology];
    const setupTimeHours = isMicroObject ? (techConfig.setupTime / 60) * 0.5 : (techConfig.setupTime / 60);
    totalTimeHours += setupTimeHours;
    
    // Ensure minimum print time is reasonable (at least 1 minute for setup)
    totalTimeHours = Math.max(totalTimeHours, 0.017); // Minimum 1 minute
    
    return totalTimeHours;
  }

  /**
   * Calculate detailed cost breakdown
   */
  calculateDetailedCosts(weight, printTime, materialConfig, techConfig, complexity, quantity) {
    // Material cost - weight is in grams, convert to kg and multiply by cost per kg
    // Ensure minimum material cost for very tiny objects (at least 0.1g worth)
    const effectiveWeight = Math.max(weight, 0.1); // Minimum 0.1g
    const materialCost = (effectiveWeight / 1000) * materialConfig.costPerKg;
    
    console.log(`[Cost Estimator] Material: ${materialConfig.name || 'Unknown'}, Weight: ${weight.toFixed(4)}g (effective: ${effectiveWeight.toFixed(4)}g), Cost/kg: $${materialConfig.costPerKg}, Material Cost: $${materialCost.toFixed(4)}`);
    
    // Machine time cost (includes power)
    // For very short prints (< 5 minutes), use a minimum time charge
    const minPrintTime = 0.083; // 5 minutes minimum
    const effectivePrintTime = Math.max(printTime, minPrintTime);
    const machineTimeCost = effectivePrintTime * techConfig.baseMachineHourlyCost;
    
    console.log(`[Cost Estimator] Print time: ${printTime.toFixed(4)}h (effective: ${effectivePrintTime.toFixed(4)}h), Machine cost: $${machineTimeCost.toFixed(4)}`);
    
    // Labor cost - scale based on print time
    const laborTime = config.costFactors.laborTimePerPrint;
    // Scale labor time based on actual print time (minimum 5 minutes, max 15 minutes)
    const laborMultiplier = Math.min(1.0, Math.max(0.33, effectivePrintTime / 0.25)); // Scale from 33% to 100%
    const laborCost = laborTime * config.costFactors.laborRate * laborMultiplier;
    
    // Setup cost (amortized for quantity, but with reasonable minimum)
    // For small/medium prints, reduce setup cost
    const baseSetupCost = techConfig.setupCost / Math.min(quantity, 10);
    const setupMultiplier = effectivePrintTime < 2 ? 0.6 : 1.0; // 40% reduction for prints under 2 hours
    const setupCost = Math.max(baseSetupCost * setupMultiplier, 1.00); // Minimum $1 setup
    
    // Failure risk overhead - reduced for simple/small objects
    const failureRiskCost = (materialCost + machineTimeCost) * complexity.failureRisk;
    
    // Quality control - scale based on print time and complexity
    const qcMultiplier = effectivePrintTime < 1 ? 0.4 : (effectivePrintTime < 2 ? 0.6 : 1.0);
    const qcCost = config.costFactors.qcCost * qcMultiplier;
    
    // Packaging - scale based on weight
    let packagingCost = config.costFactors.packagingCost;
    if (weight < 10) {
      packagingCost *= 0.4; // 60% reduction for < 10g
    } else if (weight < 50) {
      packagingCost *= 0.6; // 40% reduction for < 50g
    } else if (weight < 200) {
      packagingCost *= 0.8; // 20% reduction for < 200g
    }
    
    // Total overhead (electricity, facility, etc.) - proportional to print time
    const overheadCost = effectivePrintTime * config.costFactors.electricityCostPerKWh * config.costFactors.printerPowerConsumption;
    
    const total = materialCost + machineTimeCost + laborCost + setupCost + 
                  failureRiskCost + qcCost + packagingCost + overheadCost;
    
    console.log(`[Cost Estimator] Cost breakdown: Material=$${materialCost.toFixed(2)}, Machine=$${machineTimeCost.toFixed(2)}, Labor=$${laborCost.toFixed(2)}, Setup=$${setupCost.toFixed(2)}, QC=$${qcCost.toFixed(2)}, Packaging=$${packagingCost.toFixed(2)}, Overhead=$${overheadCost.toFixed(2)}, Total=$${total.toFixed(2)}`);
    
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
