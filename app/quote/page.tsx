/**
 * Quote Tool - Comprehensive Manufacturing Analysis
 * Features: 3D preview, printability analysis, scaling, material selection, cost estimates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import SaveProjectModal from '@/components/SaveProjectModal';
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
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [aiEstimate, setAiEstimate] = useState<AIEstimate | null>(null);
  const [printability, setPrintability] = useState<PrintabilityAnalysis | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [scalePercentage, setScalePercentage] = useState(100);
  const [material, setMaterial] = useState('PLA');
  const [weightGrams, setWeightGrams] = useState<number>(0);
  const [printTimeHours, setPrintTimeHours] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedManufacturing, setSelectedManufacturing] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Calculate weight and print time when dimensions, scale, or material changes
  useEffect(() => {
    if (dimensions) {
      const densities: { [key: string]: number } = {
        'PLA': 1.24,
        'ABS': 1.04,
        'PETG': 1.27,
        'TPU': 1.21,
        'Nylon': 1.14
      };

      const density = densities[material] || 1.24;
      const scaleFactor = Math.pow(scalePercentage / 100, 3);
      const scaledVolume = dimensions.volume * scaleFactor;
      const volumeCm3 = scaledVolume / 1000;
      const infill = 0.20;
      const effectiveDensity = density * (infill * 0.85 + 0.15);
      const newWeight = volumeCm3 * effectiveDensity;
      setWeightGrams(newWeight);

      const scaledZ = dimensions.z * (scalePercentage / 100);
      const layerHeight = 0.2;
      const printSpeed = 50;
      const layers = Math.ceil(scaledZ / layerHeight);
      const avgPerimeter = 2 * ((dimensions.x * scalePercentage / 100) + (dimensions.y * scalePercentage / 100));
      const infillDensity = 0.2;
      const infillPathLength = (dimensions.x * scalePercentage / 100) * (dimensions.y * scalePercentage / 100) * infillDensity / layerHeight;
      const totalPathLength = layers * (avgPerimeter + infillPathLength);
      const timeSeconds = totalPathLength / printSpeed;
      const newPrintTime = (timeSeconds / 3600) * 1.15;
      setPrintTimeHours(newPrintTime);
    }
  }, [scalePercentage, material, dimensions]);

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
          setDimensions({
            x: parts[0],
            y: parts[1],
            z: parts[2],
            volume: data.volume
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
          },
          {
            name: 'Local Manufacturing',
            price: `$${localPrice.toFixed(2)}`,
            deliveryTime: '7-10 business days',
            description: 'Estimated cost for local manufacturing (20% more than Blueprint)',
            recommended: false
          }
        ];

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
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader
              title="Quote Tool"
              actions={
                file && (
                  <Button variant="primary" onClick={() => setIsSaveModalOpen(true)} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Project'}
                  </Button>
                )
              }
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
                                    value={scalePercentage}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === '') {
                                        setScalePercentage(100);
                                        return;
                                      }
                                      const numValue = parseInt(value);
                                      if (!isNaN(numValue)) {
                                        setScalePercentage(Math.max(10, Math.min(500, numValue)));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = parseInt(e.target.value);
                                      if (isNaN(value) || value < 10) {
                                        setScalePercentage(100);
                                      } else if (value > 500) {
                                        setScalePercentage(500);
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
                                onChange={(e) => setScalePercentage(parseInt(e.target.value))}
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

                            {/* Scaled Dimensions */}
                            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                  Scaled Dimensions
                                </p>
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
                              <ThreePreview file={file} />
                            </div>
                          </Card>
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

                            {/* Cost Breakdown */}
                            <div className="border-t pt-4" style={{ borderColor: DS.colors.border.default }}>
                              <h4 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                                Cost Breakdown
                              </h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span style={{ color: DS.colors.text.secondary }}>Material</span>
                                  <span style={{ color: DS.colors.text.primary }}>
                                    {aiEstimate.breakdown.materialCost}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span style={{ color: DS.colors.text.secondary }}>Labor</span>
                                  <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.laborCost}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span style={{ color: DS.colors.text.secondary }}>Machine</span>
                                  <span style={{ color: DS.colors.text.primary }}>
                                    {aiEstimate.breakdown.machineTime}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span style={{ color: DS.colors.text.secondary }}>Markup</span>
                                  <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.markup}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span style={{ color: DS.colors.text.secondary }}>Shipping</span>
                                  <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.shipping}</span>
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Manufacturing Options */}
                          <Card padding="lg">
                            <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                              Manufacturing Options
                            </h3>
                            <div className="space-y-3">
                              {aiEstimate.manufacturingOptions.map((option, index) => (
                                <div
                                  key={index}
                                  onClick={() => setSelectedManufacturing(option.name)}
                                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedManufacturing === option.name
                                      ? 'border-blue-500 bg-blue-500/10'
                                      : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                                  } ${option.recommended ? 'ring-2 ring-emerald-500/30' : ''}`}
                                  style={{
                                    borderColor:
                                      selectedManufacturing === option.name
                                        ? DS.colors.primary.blue
                                        : DS.colors.border.default,
                                    backgroundColor:
                                      selectedManufacturing === option.name
                                        ? DS.colors.primary.blue + '10'
                                        : DS.colors.background.panel
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm" style={{ color: DS.colors.text.primary }}>
                                          {option.name}
                                        </h4>
                                        {option.recommended && (
                                          <Badge variant="success" size="sm">
                                            Recommended
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs mb-2" style={{ color: DS.colors.text.secondary }}>
                                        {option.description}
                                      </p>
                                      {option.deliveryTime && (
                                        <div className="flex items-center gap-1 text-xs" style={{ color: DS.colors.text.tertiary }}>
                                          <Clock size={12} />
                                          {option.deliveryTime}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      {(option.price || option.estimatedCost) && (
                                        <p className="text-lg font-bold" style={{ color: DS.colors.primary.blue }}>
                                          {option.price || option.estimatedCost}
                                        </p>
                                      )}
                                      {option.priceRange && (
                                        <p className="text-sm font-medium" style={{ color: DS.colors.text.secondary }}>
                                          {option.priceRange}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

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
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (fileInput) {
                        // Clear the input so the same file can be selected again
                        fileInput.value = '';
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
