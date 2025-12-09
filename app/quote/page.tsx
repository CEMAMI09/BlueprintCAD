/**
 * Quote Tool - Comprehensive Manufacturing Analysis
 * Features: 3D preview, printability analysis, scaling, material selection, cost estimates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import ThreePreview from '@/components/ThreePreview';
import ThreeDViewer from '@/frontend/components/ThreeDViewer';
import SaveProjectModal from '@/components/SaveProjectModal';
import SubscriptionGate from '@/frontend/components/SubscriptionGate';
import UpgradeModal from '@/frontend/components/UpgradeModal';
import {
  Upload,
  FileUp,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Info,
  Package,
  Scale,
  Clock,
  Weight,
  ShoppingCart,
} from 'lucide-react';

interface PrintabilityAnalysis {
  isPrintable: boolean;
  confidence: string;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

interface Dimensions {
  x: number;
  y: number;
  z: number;
  volume: number;
}

interface AIEstimate {
  estimate: string;
  material: string;
  printTime: string;
  weight: string;
  confidence: string;
  breakdown: {
    materialCost: string;
    laborCost: string;
    machineTime: string;
    markup: string;
    shipping: string;
  };
  manufacturingOptions: Array<{
    name: string;
    price?: string;
    priceRange?: string;
    estimatedCost?: string;
    deliveryTime?: string;
    description: string;
    recommended?: boolean;
  }>;
  recommendations: string[];
}

export default function QuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [projectFileUrl, setProjectFileUrl] = useState<string | null>(null);
  const [aiEstimate, setAiEstimate] = useState<AIEstimate | null>(null);
  const [printability, setPrintability] = useState<PrintabilityAnalysis | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [scalePercentage, setScalePercentage] = useState(100);
  const [scaleInputValue, setScaleInputValue] = useState('100');
  const [material, setMaterial] = useState('PLA');
  const [weightGrams, setWeightGrams] = useState<number>(0);
  const [printTimeHours, setPrintTimeHours] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'creator' | 'enterprise'>('pro');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Check if projectId is provided in URL
    const projectId = searchParams?.get('projectId') || null;
    if (projectId) {
      loadProjectFile(projectId);
    }
  }, [searchParams]);

  const loadProjectFile = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch project');
      }
      const project = await res.json();
      
      if (project.file_path) {
        // Set the file URL for the 3D viewer
        setProjectFileUrl(`/api/files/${encodeURIComponent(project.file_path)}`);
        
        // If dimensions are available, set them
        if (project.dimensions) {
          try {
            const dims = JSON.parse(project.dimensions);
            if (dims.x && dims.y && dims.z) {
              setDimensions({
                x: dims.x,
                y: dims.y,
                z: dims.z,
                volume: dims.volume || (dims.x * dims.y * dims.z)
              });
            }
          } catch (e) {
            // Dimensions not in JSON format, ignore
          }
        }
        
        // If there's an existing estimate, use it
        if (project.ai_estimate) {
          try {
            const estimate = JSON.parse(project.ai_estimate);
            setAiEstimate(estimate);
          } catch (e) {
            // Estimate not in JSON format, ignore
          }
        }
      }
    } catch (err) {
      console.error('Error loading project file:', err);
      setError('Failed to load project file');
    }
  };

  // Recalculate printability when scale or material changes
  const recalculatePrintability = useCallback((scaledDims: Dimensions, materialType: string) => {
    if (!scaledDims) return null;

    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check scaled dimensions
    const minDimension = Math.min(scaledDims.x, scaledDims.y, scaledDims.z);
    const maxDimension = Math.max(scaledDims.x, scaledDims.y, scaledDims.z);

    // Size checks based on scaled dimensions
    if (minDimension < 0.5) {
      issues.push(`Very thin walls detected (${minDimension.toFixed(2)}mm). May not print reliably.`);
      recommendations.push('Consider increasing scale or wall thickness to at least 0.8mm for FDM printing');
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

    // Check if too small
    if (maxDimension < 5) {
      warnings.push('Very small object. Requires precision printing.');
      recommendations.push('Use slower print speeds (20-30mm/s)');
      recommendations.push('Ensure bed is perfectly leveled');
      recommendations.push('Consider scaling up for easier printing');
    }

    // Check volume - very small objects are tricky
    if (scaledDims.volume < 100) { // Less than 100mm³
      warnings.push('Very small volume. Requires precision printing.');
      recommendations.push('Use slower print speeds (20-30mm/s)');
      recommendations.push('Consider scaling up for better printability');
    }

    // Aspect ratio checks
    const aspectRatioXY = Math.max(scaledDims.x, scaledDims.y) / Math.min(scaledDims.x, scaledDims.y);
    const aspectRatioZ = scaledDims.z / Math.min(scaledDims.x, scaledDims.y);

    if (aspectRatioZ > 10) {
      warnings.push('Very tall and thin object. May be unstable during printing.');
      recommendations.push('Add a brim or raft for better bed adhesion');
      recommendations.push('Print slowly to avoid tipping');
    }

    if (aspectRatioXY > 20) {
      warnings.push('Extremely elongated shape detected.');
      recommendations.push('Orient diagonally on build plate if possible');
    }

    // Material-specific recommendations
    const materialWarnings: { [key: string]: string[] } = {
      'ABS': ['Requires heated bed (100°C) and enclosure to prevent warping', 'Print in a well-ventilated area'],
      'PETG': ['Requires heated bed (80°C)', 'More flexible than PLA, good for functional parts'],
      'TPU': ['Requires slow printing (25mm/s)', 'Flexible material, ensure proper bed adhesion'],
      'Nylon': ['Requires heated bed (80°C) and dry storage', 'Very strong but absorbs moisture'],
    };

    if (materialWarnings[materialType]) {
      materialWarnings[materialType].forEach(warning => {
        recommendations.push(warning);
      });
    }

    // General recommendations
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
  }, []);

  // Calculate weight and print time when dimensions, scale, or material changes
  useEffect(() => {
    if (dimensions && dimensions.volume > 0) {
      const densities: { [key: string]: number } = {
        'PLA': 1.24,
        'ABS': 1.04,
        'PETG': 1.27,
        'TPU': 1.21,
        'Nylon': 1.14
      };

      const density = densities[material] || 1.24;
      // Calculate volume from dimensions if not provided or seems wrong
      // Sometimes volume might be stored incorrectly, so recalculate it
      const calculatedVolume = dimensions.x * dimensions.y * dimensions.z;
      const volumeToUse = (dimensions.volume && dimensions.volume > 0 && 
                           Math.abs(dimensions.volume - calculatedVolume) / Math.max(dimensions.volume, calculatedVolume) < 0.1) 
                          ? dimensions.volume : calculatedVolume;
      
      // Volume scales by cube of scale factor (volume is 3D)
      const scaleFactor = Math.pow(scalePercentage / 100, 3);
      
      // Volume is in mm³, convert to cm³
      const scaledVolumeMm3 = volumeToUse * scaleFactor;
      const volumeCm3 = scaledVolumeMm3 / 1000;
      
      // Calculate weight with proper infill and shell
      const infillPercent = 20; // 20% infill
      const wallVolumeFraction = 0.12; // Shell walls (~12% of bounding box)
      const interiorVolumeFraction = 1.0 - wallVolumeFraction; // ~88% is interior
      const infillVolumeFraction = (infillPercent / 100) * interiorVolumeFraction; // Infill applies to interior
      const effectiveVolumeFraction = wallVolumeFraction + infillVolumeFraction;
      const newWeight = volumeCm3 * density * effectiveVolumeFraction;
      setWeightGrams(newWeight);
      
      console.log(`[Frontend Weight] Dimensions: ${dimensions.x.toFixed(2)} x ${dimensions.y.toFixed(2)} x ${dimensions.z.toFixed(2)} mm`);
      console.log(`[Frontend Weight] Stored volume: ${dimensions.volume?.toFixed(2) || 'N/A'} mm³, Calculated volume: ${calculatedVolume.toFixed(2)} mm³, Using: ${volumeToUse.toFixed(2)} mm³`);
      console.log(`[Frontend Weight] Scale: ${scalePercentage}%, Scaled volume: ${scaledVolumeMm3.toFixed(2)} mm³ = ${volumeCm3.toFixed(4)} cm³`);
      console.log(`[Frontend Weight] Effective fraction: ${(effectiveVolumeFraction * 100).toFixed(1)}%, Density: ${density} g/cm³, Weight: ${newWeight.toFixed(2)}g`);

      // Calculate print time more accurately
      const scaledX = dimensions.x * (scalePercentage / 100);
      const scaledY = dimensions.y * (scalePercentage / 100);
      const scaledZ = dimensions.z * (scalePercentage / 100);
      
      const layerHeight = 0.2;
      const printSpeed = 50; // mm/s
      const layers = Math.ceil(scaledZ / layerHeight);
      
      // Perimeter length (2 perimeters)
      const avgPerimeter = 2 * (scaledX + scaledY);
      
      // Infill path length per layer
      const layerArea = scaledX * scaledY;
      const infillSpacing = 2; // mm between infill lines
      const infillPathLength = (layerArea * infillPercent / 100) / infillSpacing;
      
      // Total path length
      const pathLengthPerLayer = avgPerimeter * 2 + infillPathLength;
      const totalPathLength = pathLengthPerLayer * layers;
      
      // Base print time
      const printTimeSeconds = totalPathLength / printSpeed;
      
      // Add overhead (first layer slower, travel time, retractions)
      const firstLayerTime = avgPerimeter / 20; // First layer at 20mm/s
      const travelTime = totalPathLength * 0.3 / 150; // 30% travel at 150mm/s
      const retractTime = layers * 2; // 2 seconds per layer
      
      // Total time in hours
      const totalTimeSeconds = printTimeSeconds + firstLayerTime + travelTime + retractTime;
      const newPrintTime = (totalTimeSeconds / 3600) * 1.15; // 15% safety margin
      setPrintTimeHours(newPrintTime);

      // Recalculate printability with scaled dimensions
      const scaledDimensions: Dimensions = {
        x: scaledX,
        y: scaledY,
        z: scaledZ,
        volume: scaledVolumeMm3
      };
      const newPrintability = recalculatePrintability(scaledDimensions, material);
      if (newPrintability) {
        setPrintability(newPrintability);
      }
    } else if (dimensions) {
      // If volume is 0 or missing, set defaults
      setWeightGrams(0);
      setPrintTimeHours(0);
    }
  }, [scalePercentage, material, dimensions, recalculatePrintability]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (selectedFile: File) => {
    const validExtensions = ['.stl', '.obj', '.step', '.stp', '.iges', '.igs', '.fbx', '.3mf'];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setError('Please upload a valid CAD file (STL, OBJ, STEP, IGES, FBX, or 3MF)');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    setAiEstimate(null);
    setPrintability(null);
    setDimensions(null);
    setScalePercentage(100);
    setScaleInputValue('100');
    setWeightGrams(0);
    setPrintTimeHours(0);

    // Analyze file for dimensions and printability
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/quote/analyze', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.dimensions && data.volume) {
          const parts = data.dimensions.replace(' mm', '').split('x').map(parseFloat);
          // Ensure volume is in mm³ (if it's in cm³, multiply by 1000)
          let volume = data.volume;
          const calculatedVolume = parts[0] * parts[1] * parts[2];
          // If volume is much smaller than calculated, it's likely in cm³
          if (volume < calculatedVolume / 10 && calculatedVolume > 0) {
            volume = volume * 1000; // Convert cm³ to mm³
          }
          setDimensions({
            x: parts[0],
            y: parts[1],
            z: parts[2],
            volume: volume || calculatedVolume
          });
        }
        if (data.printability) {
          setPrintability(data.printability);
        }
      }
    } catch (err) {
      console.error('Failed to analyze file:', err);
    }
  };

  const handleGetEstimate = useCallback(async () => {
    if (!file) return;

    setEstimating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scale', scalePercentage.toString());
      formData.append('material', material);
      
      console.log('[Quote] Requesting estimate with:', { 
        scale: scalePercentage, 
        material, 
        fileSize: file.size 
      });

      const token = localStorage.getItem('token');
      const res = await fetch('/api/projects/estimate', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        // Update manufacturing options to include local estimate (20% more)
        const basePrice = parseFloat(data.estimate.replace(/[^0-9.]/g, '')) || 0;
        const localPrice = basePrice * 1.2;
        
        const manufacturingOptions = [
          {
            name: 'Blueprint Manufacturing',
            price: data.estimate,
            deliveryTime: '5-7 business days',
            description: 'Professional manufacturing with quality guarantee',
            recommended: true
          }
        ];

        // Parse weight and print time from API response if available
        let apiWeight = weightGrams;
        let apiPrintTime = printTimeHours;
        
        if (data.weight) {
          const weightMatch = data.weight.match(/([\d.]+)\s*g/);
          if (weightMatch) {
            apiWeight = parseFloat(weightMatch[1]);
          }
        }
        
        if (data.printTime) {
          // Parse time like "2h 30m" or "150 minutes"
          const timeMatch = data.printTime.match(/(\d+)\s*h/);
          const minMatch = data.printTime.match(/(\d+)\s*m/);
          if (timeMatch || minMatch) {
            const hours = timeMatch ? parseFloat(timeMatch[1]) : 0;
            const minutes = minMatch ? parseFloat(minMatch[1]) : 0;
            apiPrintTime = hours + (minutes / 60);
          } else {
            const minOnly = data.printTime.match(/(\d+)\s*minutes?/);
            if (minOnly) {
              apiPrintTime = parseFloat(minOnly[1]) / 60;
            }
          }
        }
        
        // Don't overwrite frontend-calculated weight with API weight
        // The frontend calculation is more accurate and reactive to scale/material changes
        // Only use API print time (it's calculated from actual file analysis)
        if (apiPrintTime > 0) setPrintTimeHours(apiPrintTime);
        
        setAiEstimate({
          ...data,
          material: material,
          manufacturingOptions: manufacturingOptions
        });
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to get estimate');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setEstimating(false);
    }
  }, [file, scalePercentage, material]);

  // Auto-run estimate when dimensions are first set (after file upload)
  useEffect(() => {
    if (file && dimensions && !aiEstimate && !estimating) {
      // Small delay to ensure all state is ready
      const timer = setTimeout(() => {
        handleGetEstimate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dimensions, file, aiEstimate, estimating, handleGetEstimate]);

  // Auto-update estimate when material or scale changes (if estimate already exists)
  useEffect(() => {
    if (file && dimensions && aiEstimate && !estimating) {
      // Debounce to avoid too many API calls
      const timer = setTimeout(() => {
        handleGetEstimate();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // Only depend on scalePercentage and material, not aiEstimate or handleGetEstimate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scalePercentage, material]);

  const handleOrderManufacturing = async () => {
    if (!file || !aiEstimate) {
      setError('Please ensure you have an estimate');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Prepare order data
      const orderData = {
        fileName: file.name,
        manufacturingOption: 'Blueprint Manufacturing',
        estimatedCost: aiEstimate.estimate,
        deliveryTime: '5-7 business days',
        material: material,
        scalePercentage: scalePercentage,
        dimensions: dimensions ? JSON.stringify({
          x: dimensions.x * scalePercentage / 100,
          y: dimensions.y * scalePercentage / 100,
          z: dimensions.z * scalePercentage / 100,
          volume: dimensions.volume * Math.pow(scalePercentage / 100, 3)
        }) : null,
        weight: weightGrams,
        printTime: printTimeHours,
        aiEstimate: JSON.stringify(aiEstimate),
        breakdown: aiEstimate.breakdown ? JSON.stringify(aiEstimate.breakdown) : null
      };

      // Store order data and redirect directly to order page
      sessionStorage.setItem('manufacturingOrder', JSON.stringify({
        ...orderData,
        price: parseFloat(aiEstimate.estimate.replace(/[^0-9.]/g, ''))
      }));

      router.push('/order');
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setProcessing(false);
    }
  };

  const handleSaveProject = async (projectData: {
    title: string;
    description: string;
    tags: string;
    is_public: boolean;
    for_sale: boolean;
    price: string;
  }) => {
    if (!file || !user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // First upload the file
      const fileFormData = new FormData();
      fileFormData.append('file', file);

      const token = localStorage.getItem('token');
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fileFormData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const uploadData = await uploadRes.json();
      const { filePath, thumbnailPath, dimensions: fileDimensions, volume } = uploadData;

      // Then create the project with metadata
      const projectPayload = {
        ...projectData,
        file_path: filePath,
        file_type: file.name.split('.').pop(),
        thumbnail: thumbnailPath || null,
        dimensions: fileDimensions || null,
        price: projectData.for_sale ? parseFloat(projectData.price) || null : null
      };

      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectPayload)
      });

      if (!projectRes.ok) {
        const errorData = await projectRes.json();
        throw new Error(errorData.error || 'Project creation failed');
      }

      const project = await projectRes.json();
      setIsSaveModalOpen(false);
      router.push(`/project/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Hidden file input for "Upload Different File" button */}
      <input
        type="file"
        id="file-upload-replace"
        className="hidden"
        accept=".stl,.obj,.step,.stp,.iges,.igs,.fbx,.3mf"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileChange(e.target.files[0]);
          }
          // Reset the input so the same file can be selected again
          e.target.value = '';
        }}
      />
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader
              title="Quote Tool"
            />
            <PanelContent>
              <div className="max-w-7xl mx-auto px-6 py-6">
                {/* File Upload Section */}
                {!file ? (
                  <Card padding="none">
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer`}
                      style={{
                        borderColor: dragActive ? DS.colors.primary.blue : DS.colors.border.default,
                        backgroundColor: dragActive ? DS.colors.primary.blue + '10' : 'transparent'
                      }}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => {
                        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                        if (fileInput) {
                          fileInput.click();
                        }
                      }}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".stl,.obj,.step,.stp,.iges,.igs,.fbx,.3mf"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      />
                      <Upload size={64} style={{ color: DS.colors.text.tertiary, margin: '0 auto 1rem' }} />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                        Upload Your CAD File
                      </h3>
                      <p className="text-base mb-6" style={{ color: DS.colors.text.secondary }}>
                        Drag and drop your STL file here, or click to browse
                      </p>
                      <div style={{ display: 'inline-block' }}>
                        <Button variant="primary" icon={<FileUp size={18} />}>
                          Choose File
                        </Button>
                      </div>
                      <p className="text-sm mt-4" style={{ color: DS.colors.text.tertiary }}>
                        Supported formats: STL, OBJ, STEP, IGES, FBX, 3MF (Max 100MB)
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Row 1: Left = File Info, Printability, Dimensions | Right = 3D Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Printability Analysis, Dimensions & Scaling */}
                      <div className="space-y-6">
                        {/* Printability Analysis */}
                        {printability && (
                          <Card padding="lg">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle size={24} style={{ color: DS.colors.accent.success }} />
                                <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                                  Printability Analysis
                                </h3>
                              </div>
                              {estimating && (
                                <div className="flex items-center gap-2 text-sm" style={{ color: DS.colors.text.secondary }}>
                                  <Sparkles size={18} className="animate-spin" />
                                  <span>Analyzing...</span>
                                </div>
                              )}
                            </div>

                            {error && (
                              <div
                                className="mb-4 p-3 rounded-lg flex items-center gap-2"
                                style={{ backgroundColor: DS.colors.accent.error + '20' }}
                              >
                                <AlertCircle size={20} style={{ color: DS.colors.accent.error }} />
                                <span style={{ color: DS.colors.accent.error }}>{error}</span>
                              </div>
                            )}

                            <div
                              className={`p-4 rounded-lg mb-4 ${
                                printability.isPrintable
                                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                                  : 'bg-red-500/10 border border-red-500/30'
                              }`}
                            >
                              <p
                                className={`font-semibold ${
                                  printability.isPrintable ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {printability.isPrintable
                                  ? '✓ Model appears printable'
                                  : '✗ Potential printing issues detected'}
                              </p>
                              <p className="text-sm mt-1" style={{ color: DS.colors.text.secondary }}>
                                Confidence: <span className="capitalize">{printability.confidence}</span>
                              </p>
                            </div>

                            {printability.issues.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.accent.error }}>
                                  Issues:
                                </h4>
                                <ul className="space-y-1">
                                  {printability.issues.map((issue, i) => (
                                    <li key={i} className="text-sm flex items-start" style={{ color: DS.colors.accent.error }}>
                                      <span className="mr-2">•</span>
                                      <span>{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {printability.warnings.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.accent.warning }}>
                                  Warnings:
                                </h4>
                                <ul className="space-y-1">
                                  {printability.warnings.map((warning, i) => (
                                    <li key={i} className="text-sm flex items-start" style={{ color: DS.colors.accent.warning }}>
                                      <span className="mr-2">⚠</span>
                                      <span>{warning}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {printability.recommendations.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.primary.blue }}>
                                  Recommendations:
                                </h4>
                                <ul className="space-y-1">
                                  {printability.recommendations.map((rec, i) => (
                                    <li key={i} className="text-sm flex items-start" style={{ color: DS.colors.text.secondary }}>
                                      <span className="mr-2" style={{ color: DS.colors.primary.blue }}>→</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Card>
                        )}

                        {/* Dimensions & Scaling */}
                        {dimensions && (
                          <Card padding="lg">
                            <div className="flex items-center gap-2 mb-4">
                              <Scale size={24} style={{ color: DS.colors.primary.blue }} />
                              <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                                Dimensions & Scaling
                              </h3>
                            </div>

                            {/* Original Dimensions */}
                            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                              <p className="text-sm mb-3" style={{ color: DS.colors.text.secondary }}>
                                Original Dimensions
                              </p>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs mb-1" style={{ color: DS.colors.text.tertiary }}>
                                    Width (X)
                                  </p>
                                  <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                    {dimensions.x.toFixed(2)} mm
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs mb-1" style={{ color: DS.colors.text.tertiary }}>
                                    Depth (Y)
                                  </p>
                                  <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                    {dimensions.y.toFixed(2)} mm
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs mb-1" style={{ color: DS.colors.text.tertiary }}>
                                    Height (Z)
                                  </p>
                                  <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                    {dimensions.z.toFixed(2)} mm
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Scale Percentage */}
                            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                              <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                                  Scale Percentage
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="10"
                                    max="500"
                                    value={scaleInputValue}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setScaleInputValue(value);
                                      // Allow empty input while typing
                                      if (value === '') {
                                        return;
                                      }
                                      const numValue = parseInt(value);
                                      if (!isNaN(numValue)) {
                                        const clampedValue = Math.max(10, Math.min(500, numValue));
                                        setScalePercentage(clampedValue);
                                        // Update input value if it was clamped
                                        if (numValue !== clampedValue) {
                                          setScaleInputValue(clampedValue.toString());
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      if (value === '' || isNaN(parseInt(value))) {
                                        setScaleInputValue('100');
                                        setScalePercentage(100);
                                      } else {
                                        const numValue = parseInt(value);
                                        const clampedValue = Math.max(10, Math.min(500, numValue));
                                        setScaleInputValue(clampedValue.toString());
                                        setScalePercentage(clampedValue);
                                      }
                                    }}
                                    className="w-20 px-3 py-1 rounded text-center font-semibold"
                                    style={{
                                      backgroundColor: DS.colors.background.elevated,
                                      border: `1px solid ${DS.colors.border.default}`,
                                      color: DS.colors.text.primary
                                    }}
                                  />
                                  <span style={{ color: DS.colors.text.secondary }}>%</span>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="500"
                                value={scalePercentage}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value);
                                  setScalePercentage(newValue);
                                  setScaleInputValue(newValue.toString());
                                }}
                                onMouseUp={(e) => {
                                  // Sync input value when slider is released
                                  const newValue = parseInt((e.target as HTMLInputElement).value);
                                  setScaleInputValue(newValue.toString());
                                }}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                style={{
                                  backgroundColor: DS.colors.background.elevated,
                                  accentColor: DS.colors.primary.blue
                                }}
                              />
                              <div className="flex justify-between text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                <span>10%</span>
                                <span>250%</span>
                                <span>500%</span>
                              </div>
                            </div>


                            {/* Material Type */}
                            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                              <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                                Material Type
                              </label>
                              <select
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg focus:outline-none"
                                style={{
                                  backgroundColor: DS.colors.background.elevated,
                                  border: `1px solid ${DS.colors.border.default}`,
                                  color: DS.colors.text.primary
                                }}
                              >
                                <option value="PLA">PLA (1.24 g/cm³)</option>
                                <option value="ABS">ABS (1.04 g/cm³)</option>
                                <option value="PETG">PETG (1.27 g/cm³)</option>
                                <option value="TPU">TPU (1.21 g/cm³)</option>
                                <option value="Nylon">Nylon (1.14 g/cm³)</option>
                              </select>
                            </div>

                            {/* Weight & Print Time */}
                            <div className="grid grid-cols-2 gap-3">
                              <div
                                className="p-4 rounded-lg border"
                                style={{
                                  background: `linear-gradient(135deg, ${DS.colors.accent.purple}20, ${DS.colors.accent.cyan}20)`,
                                  borderColor: DS.colors.accent.purple + '40'
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Weight size={16} style={{ color: DS.colors.accent.purple }} />
                                  <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                    Estimated Weight
                                  </p>
                                </div>
                                <p className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                                  {weightGrams.toFixed(1)}g
                                </p>
                                <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                  {(weightGrams / 28.3495).toFixed(2)} oz
                                </p>
                              </div>
                              <div
                                className="p-4 rounded-lg border"
                                style={{
                                  background: `linear-gradient(135deg, ${DS.colors.primary.blue}20, ${DS.colors.accent.cyan}20)`,
                                  borderColor: DS.colors.primary.blue + '40'
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock size={16} style={{ color: DS.colors.primary.blue }} />
                                  <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                    Print Time
                                  </p>
                                </div>
                                <p className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                                  {Math.floor(printTimeHours)}h {Math.round((printTimeHours % 1) * 60)}m
                                </p>
                                <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                  {printTimeHours.toFixed(2)} hours
                                </p>
                              </div>
                            </div>

                            {scalePercentage !== 100 && (
                              <div
                                className="mt-4 p-3 rounded-lg"
                                style={{
                                  backgroundColor: DS.colors.accent.warning + '20',
                                  border: `1px solid ${DS.colors.accent.warning}40`
                                }}
                              >
                                <p className="text-xs" style={{ color: DS.colors.accent.warning }}>
                                  <strong>Note:</strong> Volume scales cubically. At {scalePercentage}% scale, volume is{' '}
                                  {Math.pow(scalePercentage / 100, 3).toFixed(2)}× the original (
                                  {scalePercentage > 100 ? 'more' : 'less'} material & time needed).
                                </p>
                              </div>
                            )}
                          </Card>
                        )}

                        {/* Recommendations */}
                        {aiEstimate && aiEstimate.recommendations.length > 0 && (
                          <Card padding="lg">
                            <div className="flex items-start gap-3">
                              <Info size={20} style={{ color: DS.colors.primary.blue, flexShrink: 0, marginTop: '2px' }} />
                              <div className="flex-1">
                                <h4 className="font-semibold mb-2 text-sm" style={{ color: DS.colors.text.primary }}>
                                  Recommendations
                                </h4>
                                <ul className="space-y-1 text-xs" style={{ color: DS.colors.text.secondary }}>
                                  {aiEstimate.recommendations.map((rec, index) => (
                                    <li key={index}>• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>

                      {/* Right Column - 3D Preview, AI Estimate, Manufacturing Options */}
                      <div className="space-y-6">
                        {file && (
                          <>
                            <Card padding="lg">
                              <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                                3D Preview
                              </h3>
                              <div
                                className="w-full rounded-lg overflow-hidden relative"
                                style={{ 
                                  backgroundColor: DS.colors.background.panel,
                                  aspectRatio: '16/9',
                                  minHeight: '300px'
                                }}
                              >
                                {projectFileUrl ? (
                                  <ThreeDViewer
                                    fileUrl={projectFileUrl}
                                    fileName={projectFileUrl.split('/').pop() || 'model'}
                                    fileType=".stl"
                                    preset="detail"
                                  />
                                ) : (
                                  <ThreePreview file={file} />
                                )}
                              </div>
                            </Card>

                            {/* Current Dimensions */}
                            {dimensions && (
                              <Card padding="lg">
                                <div className="flex items-center gap-2 mb-4">
                                  <Scale size={20} style={{ color: DS.colors.primary.blue }} />
                                  <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                                    Current Dimensions
                                  </h3>
                                  {scalePercentage !== 100 && (
                                    <Badge variant="primary" size="sm">
                                      {scalePercentage > 100 ? '+' : ''}
                                      {(scalePercentage - 100).toFixed(0)}%
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <p className="text-xs mb-1" style={{ color: DS.colors.text.tertiary }}>
                                      Width (X)
                                    </p>
                                    <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                      {(dimensions.x * scalePercentage / 100).toFixed(2)} mm
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs mb-1" style={{ color: DS.colors.text.tertiary }}>
                                      Depth (Y)
                                    </p>
                                    <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                      {(dimensions.y * scalePercentage / 100).toFixed(2)} mm
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs mb-1" style={{ color: DS.colors.text.tertiary }}>
                                      Height (Z)
                                    </p>
                                    <p className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                      {(dimensions.z * scalePercentage / 100).toFixed(2)} mm
                                    </p>
                                  </div>
                                </div>
                              </Card>
                            )}
                          </>
                        )}

                        {/* AI Estimate & Manufacturing Options */}
                        {aiEstimate && (
                          <>

                          {/* AI Estimate */}
                          <Card padding="lg">
                            <div className="flex items-center gap-2 mb-4">
                              <Sparkles size={24} style={{ color: DS.colors.primary.blue }} />
                              <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                                Estimated Cost
                              </h3>
                              <Badge variant="success" size="sm">
                                {aiEstimate.confidence} confidence
                              </Badge>
                            </div>

                            <div
                              className="p-6 rounded-lg mb-4"
                              style={{
                                background: `linear-gradient(135deg, ${DS.colors.accent.success}20, ${DS.colors.primary.blue}20)`,
                                border: `1px solid ${DS.colors.accent.success}40`
                              }}
                            >
                              <div className="text-center">
                                <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                                  Total Estimate
                                </p>
                                <p className="text-3xl font-bold" style={{ color: DS.colors.accent.success }}>
                                  {aiEstimate.estimate}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                                  Material
                                </p>
                                <p className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                                  {aiEstimate.material}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                                  Print Time
                                </p>
                                <p className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                                  {printTimeHours > 0
                                    ? `${Math.floor(printTimeHours)}h ${Math.round((printTimeHours % 1) * 60)}m`
                                    : aiEstimate.printTime}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                                  Weight
                                </p>
                                <p className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                                  {weightGrams > 0 ? `${weightGrams.toFixed(1)}g` : aiEstimate.weight}
                                </p>
                                {weightGrams > 0 && (
                                  <p className="text-xs" style={{ color: DS.colors.text.tertiary }}>
                                    {(weightGrams / 28.3495).toFixed(2)} oz
                                  </p>
                                )}
                              </div>
                            </div>

                          </Card>

                          {/* Blueprint Manufacturing Order */}
                          {aiEstimate && (
                            <Card padding="lg">
                              <div className="flex items-center gap-2 mb-4">
                                <Package size={24} style={{ color: DS.colors.primary.blue }} />
                                <h3 className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                                  Blueprint Manufacturing
                                </h3>
                                <Badge variant="success" size="sm">
                                  Recommended
                                </Badge>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                                  Professional manufacturing with quality guarantee
                                </p>
                                
                                <div className="space-y-3 mb-6">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm" style={{ color: DS.colors.text.secondary }}>Estimated Cost</span>
                                    <span className="text-2xl font-bold" style={{ color: DS.colors.accent.success }}>
                                      {aiEstimate.estimate}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm" style={{ color: DS.colors.text.secondary }}>Delivery Time</span>
                                    <div className="flex items-center gap-1 text-sm" style={{ color: DS.colors.text.primary }}>
                                      <Clock size={14} />
                                      <span>5-7 business days</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm" style={{ color: DS.colors.text.secondary }}>Material</span>
                                    <span className="text-sm font-medium" style={{ color: DS.colors.text.primary }}>
                                      {material}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <Button
                                variant="primary"
                                onClick={handleOrderManufacturing}
                                disabled={processing}
                                className="w-full"
                                icon={<ShoppingCart size={18} />}
                                style={{ background: DS.colors.primary.blue, color: '#fff' }}
                              >
                                {processing ? 'Processing...' : 'Send Order Request'}
                              </Button>
                              <p className="text-xs mt-2 text-center" style={{ color: DS.colors.text.tertiary }}>
                                You'll be redirected to the order page to complete your request
                              </p>
                            </Card>
                          )}

                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </PanelContent>
          </CenterPanel>
        }
        rightPanel={
          file && (
            <RightPanel>
              <div className="p-6">
                <h3 className="font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    icon={<Package size={18} />}
                    className="w-full"
                    onClick={() => setIsSaveModalOpen(true)}
                    disabled={loading}
                  >
                    Save to Projects
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      const fileInput = document.getElementById('file-upload-replace') as HTMLInputElement;
                      if (fileInput) {
                        // Open file picker - handleFileChange will reset state and process the new file
                        fileInput.click();
                      }
                    }}
                  >
                    Upload Different File
                  </Button>
                </div>
              </div>
            </RightPanel>
          )
        }
      />
      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSubmit={handleSaveProject}
        fileName={file?.name || ''}
        loading={loading}
      />
    </>
  );
}
