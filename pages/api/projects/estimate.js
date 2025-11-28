import formidable from 'formidable';
import fs from 'fs';
const PrintCostEstimator = require('../../shared/utils/print-cost-estimator');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    maxFileSize: 50 * 1024 * 1024, // 50MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Parse error' });
    }
    
    try {
      const uploaded = files.file;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Parse request parameters
      const scale = Array.isArray(fields.scale) ? parseInt(fields.scale[0]) : parseInt(fields.scale) || 100;
      const material = Array.isArray(fields.material) ? fields.material[0] : fields.material || 'PLA';
      const quality = Array.isArray(fields.quality) ? fields.quality[0] : fields.quality || 'standard';
      const infill = Array.isArray(fields.infill) ? parseInt(fields.infill[0]) : parseInt(fields.infill) || 20;
      const quantity = Array.isArray(fields.quantity) ? parseInt(fields.quantity[0]) : parseInt(fields.quantity) || 1;

      console.log('[Estimate API] Request parameters:', { scale, material, quality, infill, quantity });
      
      try {
        // Use the advanced cost estimator
        const estimator = new PrintCostEstimator();
        
        const result = await estimator.estimateCost(file.filepath, {
          scale,
          material,
          quality,
          infill,
          quantity,
          shipping: 'standard'
        });
        
        console.log('[Estimate API] Material used:', material, 'Material cost:', result.breakdown.material, 'Total:', result.estimate.totalPrice);

        // Format response for frontend compatibility
        const response = {
          estimate: `$${result.estimate.totalPrice.toFixed(2)}`,
          material: result.specifications.material,
          printTime: result.specifications.printTime,
          weight: result.specifications.weight,
          confidence: `${result.confidence.score}%`,
          confidenceDescription: result.confidence.description,
          breakdown: {
            materialCost: `$${result.breakdown.material.toFixed(2)}`,
            laborCost: `$${result.breakdown.labor.toFixed(2)}`,
            machineTime: `$${result.breakdown.machineTime.toFixed(2)}`,
            setup: `$${result.breakdown.setup.toFixed(2)}`,
            overhead: `$${result.breakdown.overhead.toFixed(2)}`,
            qualityControl: `$${result.breakdown.qualityControl.toFixed(2)}`,
            packaging: `$${result.breakdown.packaging.toFixed(2)}`,
            markup: `$${result.breakdown.markup.toFixed(2)}`,
            shipping: `$${result.breakdown.shipping.toFixed(2)}`,
            subtotal: `$${result.breakdown.subtotal.toFixed(2)}`
          },
          specifications: {
            dimensions: result.specifications.dimensions,
            infill: result.specifications.infill,
            layerHeight: result.specifications.layerHeight,
            quality: result.specifications.quality,
            technology: result.specifications.technology,
            complexity: result.specifications.complexity
          },
          manufacturingOptions: result.manufacturingOptions.map(opt => ({
            name: opt.name,
            price: opt.price ? `$${opt.price.toFixed(2)}` : undefined,
            estimatedCost: opt.estimatedCost ? `$${opt.estimatedCost.toFixed(2)}` : undefined,
            priceRange: opt.priceRange,
            deliveryTime: opt.deliveryTime,
            description: opt.description,
            features: opt.features,
            disclaimer: opt.disclaimer,
            recommended: opt.recommended
          })),
          recommendations: result.recommendations.map(r => r.message || r)
        };

        res.status(200).json(response);

      } catch (estimatorError) {
        console.error('Cost estimation error:', estimatorError);
        
        // Fallback to simple estimation
        const stats = fs.statSync(file.filepath);
        const fileSizeMB = stats.size / (1024 * 1024);
        const scaleFactor = Math.pow(scale / 100, 3);
        
        const materialCost = fileSizeMB * 1.5 * scaleFactor;
        const machineTime = fileSizeMB * 2.5 * scaleFactor;
        const laborCost = 8.00;
        const shippingCost = 8.50;
        const subtotal = materialCost + machineTime + laborCost;
        const markupAmount = subtotal * 0.35;
        const totalPrice = subtotal + markupAmount + shippingCost;
        
        const fallbackEstimate = {
          estimate: `$${totalPrice.toFixed(2)}`,
          material: material,
          printTime: `${Math.ceil(fileSizeMB * 45 * scaleFactor)} minutes`,
          weight: `${Math.ceil(fileSizeMB * 20 * scaleFactor)}g`,
          confidence: `60%`,
          confidenceDescription: 'Medium - Fallback estimation method',
          breakdown: {
            materialCost: `$${materialCost.toFixed(2)}`,
            laborCost: `$${laborCost.toFixed(2)}`,
            machineTime: `$${machineTime.toFixed(2)}`,
            markup: `$${markupAmount.toFixed(2)}`,
            shipping: `$${shippingCost.toFixed(2)}`
          },
          manufacturingOptions: [
            {
              name: 'Blueprint Manufacturing',
              price: `$${totalPrice.toFixed(2)}`,
              deliveryTime: '5-7 days',
              description: 'Professional manufacturing with quality guarantee',
              recommended: true
            },
            {
              name: 'DIY Manufacturing',
              estimatedCost: `$${(totalPrice * 0.4).toFixed(2)}`,
              description: 'Self-printing cost estimate (material + power only)'
            }
          ],
          recommendations: [
            'Standard estimation used - upload STL for more accurate pricing',
            'Consider print orientation for best results'
          ]
        };

        res.status(200).json(fallbackEstimate);
      }
    } catch (error) {
      console.error('Estimate error:', error);
      res.status(500).json({ error: 'Failed to generate estimate' });
    }
  });
}
