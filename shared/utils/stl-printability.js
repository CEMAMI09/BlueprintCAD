// STL Printability Analysis
const fs = require('fs');

/**
 * Analyze STL file for 3D printing issues
 * @param {string} filePath - Path to STL file
 * @param {object} dimensions - Dimensions object {x, y, z, volume}
 * @returns {object} Analysis results with issues and recommendations
 */
function analyzePrintability(filePath, dimensions) {
  if (!dimensions) {
    return {
      isPrintable: true,
      confidence: 'unknown',
      issues: [],
      warnings: [],
      recommendations: []
    };
  }

  const issues = [];
  const warnings = [];
  const recommendations = [];

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    issues.push('File not found for analysis');
    return {
      isPrintable: false,
      confidence: 'low',
      issues,
      warnings,
      recommendations
    };
  }

  // 1. Check dimensions - too small or too large
  const minDimension = Math.min(dimensions.x, dimensions.y, dimensions.z);
  const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);

  if (minDimension < 0.5) {
    issues.push(`Very thin walls detected (${minDimension.toFixed(2)}mm). May not print reliably.`);
    recommendations.push('Consider increasing wall thickness to at least 0.8mm for FDM printing');
  } else if (minDimension < 1.0) {
    warnings.push(`Thin features detected (${minDimension.toFixed(2)}mm). Print with care.`);
    recommendations.push('Use a 0.2mm or smaller nozzle for better detail');
  }

  // Check if too large for common build volumes
  const commonBuildVolume = 220; // 220x220x250 is common (Ender 3, etc.)
  if (maxDimension > commonBuildVolume) {
    warnings.push(`Design exceeds common printer build volume (${maxDimension.toFixed(0)}mm). May need to be split or scaled down.`);
    recommendations.push(`Consider scaling down to fit ${commonBuildVolume}mm build plate`);
  }

  // 2. Check aspect ratio - tall thin objects are unstable
  const aspectRatioXY = Math.max(dimensions.x, dimensions.y) / Math.min(dimensions.x, dimensions.y);
  const aspectRatioZ = dimensions.z / Math.min(dimensions.x, dimensions.y);

  if (aspectRatioZ > 10) {
    warnings.push('Very tall and thin object. May be unstable during printing.');
    recommendations.push('Add a brim or raft for better bed adhesion');
    recommendations.push('Print slowly to avoid tipping');
  }

  if (aspectRatioXY > 20) {
    warnings.push('Extremely elongated shape detected.');
    recommendations.push('Orient diagonally on build plate if possible');
  }

  // 3. Check volume - very small objects are tricky
  if (dimensions.volume < 100) { // Less than 100mm³
    warnings.push('Very small object. Requires precision printing.');
    recommendations.push('Use slower print speeds (20-30mm/s)');
    recommendations.push('Ensure bed is perfectly leveled');
  }

  // 4. Parse STL for triangle analysis (basic checks)
  try {
    const buffer = fs.readFileSync(filePath);
    const header = buffer.toString('ascii', 0, 5);
    const isBinary = header !== 'solid';

    if (isBinary) {
      const triangleCount = buffer.readUInt32LE(80);
      
      // Check for extremely high poly count
      if (triangleCount > 500000) {
        warnings.push(`Very high triangle count (${triangleCount.toLocaleString()}). File may be slow to process.`);
        recommendations.push('Consider decimating/simplifying the mesh');
      }

      // Check for suspiciously low poly count
      if (triangleCount < 10) {
        issues.push('Model has very few triangles. May be incomplete or corrupt.');
      }
    }
  } catch (error) {
    console.warn('Could not analyze STL geometry:', error.message);
  }

  // 5. General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Use 0.2mm layer height for good quality/speed balance');
    recommendations.push('Add supports if design has overhangs greater than 45°');
    recommendations.push('Consider part orientation to minimize support material');
  }

  // Determine printability
  const isPrintable = issues.length === 0;
  let confidence = 'high';
  
  if (issues.length > 0) {
    confidence = 'low';
  } else if (warnings.length > 2) {
    confidence = 'medium';
  } else if (warnings.length > 0) {
    confidence = 'good';
  }

  return {
    isPrintable,
    confidence,
    issues,
    warnings,
    recommendations: recommendations.slice(0, 5) // Limit to 5 recommendations
  };
}

module.exports = {
  analyzePrintability
};
