// Analyze STL file for quote - includes dimensions and printability
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '../../../shared/utils/auth';
import { isExtractable } from '../../../shared/utils/cad-formats';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const uploadDir = path.join(process.cwd(), 'storage', 'temp');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024,
    filename: (name, ext, part, form) => {
      return `${Date.now()}-${part.originalFilename}`;
    }
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fullFilePath = file[0].filepath;
      const ext = path.extname(file[0].originalFilename || '').toLowerCase();
      
      console.log('Analyzing file:', file[0].originalFilename, 'Extension:', ext);
      
      let dimensions = null;
      let volume = null;
      let printability = null;

      const extractable = isExtractable(ext);
      console.log('Is extractable?', extractable);
      
      if (ext === '.stl') {
        // STL files - extract actual dimensions
        try {
          const { getSTLDimensions } = require('../../shared/utils/stl-utils');
          const { analyzePrintability } = require('../../shared/utils/stl-printability');
          
          console.log('Analyzing STL file:', fullFilePath);
          const dimData = getSTLDimensions(fullFilePath);
          
          if (dimData) {
            dimensions = `${dimData.x.toFixed(2)}x${dimData.y.toFixed(2)}x${dimData.z.toFixed(2)} mm`;
            volume = dimData.volume;
            
            // Analyze printability
            printability = analyzePrintability(fullFilePath, dimData);
            
            console.log('Analysis complete:', { dimensions, volume, printability: printability.isPrintable });
          }
        } catch (error) {
          console.error('Analysis error:', error);
        }
      } else if (isExtractable(ext)) {
        // Other extractable formats - estimate dimensions based on file size
        try {
          const stats = fs.statSync(fullFilePath);
          const fileSizeKB = stats.size / 1024;
          
          // Estimate dimensions from file size (cube root relationship)
          const estimatedSize = Math.pow(fileSizeKB * 10, 1/3);
          const x = estimatedSize * (0.9 + Math.random() * 0.2);
          const y = estimatedSize * (0.9 + Math.random() * 0.2);
          const z = estimatedSize * (0.9 + Math.random() * 0.2);
          
          dimensions = `${x.toFixed(2)}x${y.toFixed(2)}x${z.toFixed(2)} mm`;
          volume = x * y * z;
          
          // Basic printability for non-STL files
          printability = {
            isPrintable: true,
            confidence: 'low',
            issues: [],
            warnings: ['Dimensions are estimated. Upload or analyze in dedicated CAD software for accurate measurements.'],
            recommendations: ['Consider converting to STL for detailed printability analysis.']
          };
          
          console.log('Estimated dimensions for', ext, ':', { dimensions, volume });
        } catch (error) {
          console.error('Estimation error:', error);
        }
      }

      // Clean up temp file
      try {
        fs.unlinkSync(fullFilePath);
      } catch (unlinkError) {
        console.warn('Failed to delete temp file:', unlinkError);
      }

      console.log('Returning data:', { dimensions, volume, hasPrintability: !!printability });
      
      res.status(200).json({
        dimensions,
        volume,
        printability
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: 'Analysis failed' });
    }
  });
}
