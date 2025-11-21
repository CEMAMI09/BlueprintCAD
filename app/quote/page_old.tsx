'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ThreePreview from '@/components/ThreePreview';

interface ManufacturingOption {
  name: string;
  price?: string;
  priceRange?: string;
  estimatedCost?: string;
  deliveryTime?: string;
  description: string;
  recommended?: boolean;
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
  manufacturingOptions: ManufacturingOption[];
  recommendations: string[];
}

interface PrintabilityAnalysis {
  isPrintable: boolean;
  confidence: string;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export default function GetQuote() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aiEstimate, setAiEstimate] = useState<AIEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedManufacturing, setSelectedManufacturing] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{x: number, y: number, z: number, volume: number} | null>(null);
  const [scalePercentage, setScalePercentage] = useState(100);
  const [weightGrams, setWeightGrams] = useState<number>(0);
  const [printTimeHours, setPrintTimeHours] = useState<number>(0);
  const [material, setMaterial] = useState('PLA');
  const [printability, setPrintability] = useState<PrintabilityAnalysis | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const getAiEstimate = async (selectedFile: File, currentScale = 100, currentMaterial = 'PLA') => {
    setEstimating(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('scale', currentScale.toString());
      formData.append('material', currentMaterial);

      const res = await fetch('/api/projects/estimate', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAiEstimate({
          ...data,
          material: currentMaterial
        });
        const recommended = data.manufacturingOptions?.find((opt: ManufacturingOption) => opt.recommended);
        if (recommended) {
          setSelectedManufacturing(recommended.name);
        }
      }
    } catch (err) {
      console.error('Failed to get estimate:', err);
    } finally {
      setEstimating(false);
    }
  };

  const calculateWeight = (scale: number) => {
    if (!dimensions) return 0;
    
    const densities: {[key: string]: number} = {
      'PLA': 1.24,
      'ABS': 1.04,
      'PETG': 1.27,
      'TPU': 1.21,
      'Nylon': 1.14
    };
    
    const density = densities[material] || 1.24;
    const scaleFactor = Math.pow(scale / 100, 3);
    const scaledVolume = dimensions.volume * scaleFactor;
    const volumeCm3 = scaledVolume / 1000;
    const infill = 0.20;
    const effectiveDensity = density * (infill * 0.85 + 0.15);
    
    return volumeCm3 * effectiveDensity;
  };

  const calculatePrintTime = (scale: number) => {
    if (!dimensions) return 0;
    
    const scaleFactor = Math.pow(scale / 100, 3);
    const scaledZ = dimensions.z * (scale / 100);
    
    const layerHeight = 0.2;
    const printSpeed = 50;
    const layers = Math.ceil(scaledZ / layerHeight);
    const avgPerimeter = 2 * ((dimensions.x * scale / 100) + (dimensions.y * scale / 100));
    const infillDensity = 0.2;
    const infillPathLength = (dimensions.x * scale / 100) * (dimensions.y * scale / 100) * infillDensity / layerHeight;
    const totalPathLength = layers * (avgPerimeter + infillPathLength);
    const timeSeconds = totalPathLength / printSpeed;
    
    return (timeSeconds / 3600) * 1.15;
  };

  useEffect(() => {
    if (dimensions) {
      const newWeight = calculateWeight(scalePercentage);
      const newPrintTime = calculatePrintTime(scalePercentage);
      setWeightGrams(newWeight);
      setPrintTimeHours(newPrintTime);
      
      const debounceTimer = setTimeout(() => {
        if (file) {
          getAiEstimate(file, scalePercentage, material);
        }
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scalePercentage, material, dimensions]);

  const handleFile = async (selectedFile: File) => {
    const validExtensions = ['.stl', '.obj', '.fbx', '.gltf', '.glb', '.ply', '.dae', '.scad', '.step', '.stp', '.iges', '.igs', '.dwg', '.dxf', '.f3d', '.sldprt', '.sldasm', '.ipt', '.iam', '.3mf', '.amf', '.x3d'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a supported CAD format.');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB');
      return;
    }

    setFile(selectedFile);
    setPreview(selectedFile.name);
    setError('');
    
    // Try to analyze dimensions for all file types
    try {
      const fileFormData = new FormData();
      fileFormData.append('file', selectedFile);

      const uploadRes = await fetch('/api/quote/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: fileFormData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        console.log('Analysis response:', uploadData);
        const { dimensions: dimStr, volume, printability } = uploadData;
        
        console.log('Parsed data - dimStr:', dimStr, 'volume:', volume, 'printability:', printability);
        
        // Set printability data if available (even without dimensions)
        if (printability) {
          console.log('Setting printability:', printability);
          setPrintability(printability);
        } else {
          console.log('No printability data received');
        }
        
        // Set dimensions and calculate weight/time if available
        if (dimStr && volume) {
          console.log('Setting dimensions from:', dimStr);
          const parts = dimStr.replace(' mm', '').split('x').map(parseFloat);
          const extractedDims = {
            x: parts[0],
            y: parts[1],
            z: parts[2],
            volume: volume
          };
          
          setDimensions(extractedDims);
          
          const densities: {[key: string]: number} = {
            'PLA': 1.24,
            'ABS': 1.04,
            'PETG': 1.27,
            'TPU': 1.21,
            'Nylon': 1.14
          };
          
          const density = densities[material] || 1.24;
          const volumeCm3 = volume / 1000;
          const infill = 0.20;
          const effectiveDensity = density * (infill * 0.85 + 0.15);
          const initialWeight = volumeCm3 * effectiveDensity;
          
          const layerHeight = 0.2;
          const printSpeed = 50;
          const layers = Math.ceil(extractedDims.z / layerHeight);
          const avgPerimeter = 2 * (extractedDims.x + extractedDims.y);
          const infillDensity = 0.2;
          const infillPathLength = extractedDims.x * extractedDims.y * infillDensity / layerHeight;
          const totalPathLength = layers * (avgPerimeter + infillPathLength);
          const timeSeconds = totalPathLength / printSpeed;
          const initialPrintTime = (timeSeconds / 3600) * 1.15;
          
          setWeightGrams(initialWeight);
          setPrintTimeHours(initialPrintTime);
          
          console.log('Dimensions extracted:', extractedDims);
          console.log('Initial weight:', initialWeight, 'g');
          console.log('Initial print time:', initialPrintTime, 'hours');
        }
      } else {
        console.error('Analyze API failed:', uploadRes.status, uploadRes.statusText);
        const errorText = await uploadRes.text();
        console.error('Error response:', errorText);
      }
    } catch (err) {
      console.error('Failed to analyze file:', err);
    }
    
    await getAiEstimate(selectedFile, scalePercentage, material);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setAiEstimate(null);
    setSelectedManufacturing(null);
    setDimensions(null);
    setPrintability(null);
    setError('');
  };

  const handleOrder = async () => {
    if (!selectedManufacturing || !aiEstimate || !file) {
      alert('Please select a manufacturing option first');
      return;
    }

    const selectedOption = aiEstimate.manufacturingOptions.find(
      opt => opt.name === selectedManufacturing
    );

    if (!selectedOption) return;

    // Extract price from the option - check all possible price fields
    let priceText = selectedOption.estimatedCost || selectedOption.price || selectedOption.priceRange || '';
    
    // Don't validate price - just use what we have
    if (!priceText) {
      priceText = 'Quote Required';
    }

    const confirmed = confirm(
      `Place order for ${selectedManufacturing}?\n\n` +
      `File: ${file.name}\n` +
      `Estimated Cost: ${priceText}\n` +
      `Delivery: ${selectedOption.deliveryTime || 'TBD'}\n\n` +
      `This will create an order request. Our team will contact you to confirm details and payment.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      
      // Create order record
      const orderData = {
        fileName: file.name,
        manufacturingOption: selectedManufacturing,
        estimatedCost: priceText,
        deliveryTime: selectedOption.deliveryTime,
        material: material,
        scalePercentage: scalePercentage,
        dimensions: dimensions ? `${dimensions.x}×${dimensions.y}×${dimensions.z}mm` : null,
        weight: weightGrams,
        printTime: printTimeHours,
        aiEstimate: aiEstimate.estimate,
        breakdown: aiEstimate.breakdown
      };

      const res = await fetch('/api/manufacturing-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `Order request submitted successfully!\n\n` +
          `Order ID: ${data.orderId}\n\n` +
          `Our team will contact you within 24 hours to confirm details and arrange payment.`
        );
        router.push('/orders');
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create order');
      }
    } catch (err: any) {
      console.error('Order failed:', err);
      alert(`Failed to submit order: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-2">Get Printing Quote</h1>
        <p className="text-gray-400 mb-8">Upload your 3D model to get instant pricing and manufacturing options</p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Analysis */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <label className="block text-sm font-medium mb-3">CAD File *</label>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="file"
                  accept=".stl,.obj,.fbx,.gltf,.glb,.ply,.dae,.scad,.step,.stp,.iges,.igs,.dwg,.dxf,.f3d,.sldprt,.sldasm,.ipt,.iam,.3mf,.amf,.x3d"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                
                {!preview ? (
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-400 mb-1 font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      All CAD formats supported (Max 50MB)
                    </p>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-3">
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-white font-medium">{preview}</p>
                        <p className="text-sm text-gray-400">{(file!.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-400 hover:text-red-300 text-sm font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Printability Analysis */}
            {printability && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Printability Analysis
                </h3>

                <div className={`p-4 rounded-lg mb-4 ${
                  printability.isPrintable 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  <p className={`font-semibold ${printability.isPrintable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {printability.isPrintable ? '✓ Model appears printable' : '✗ Potential printing issues detected'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Confidence: <span className="capitalize">{printability.confidence}</span>
                  </p>
                </div>

                {printability.issues.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">Issues:</h4>
                    <ul className="space-y-1">
                      {printability.issues.map((issue, i) => (
                        <li key={i} className="text-sm text-red-300 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {printability.warnings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">Warnings:</h4>
                    <ul className="space-y-1">
                      {printability.warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-yellow-300 flex items-start">
                          <span className="mr-2">⚠</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {printability.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">Recommendations:</h4>
                    <ul className="space-y-1">
                      {printability.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start">
                          <span className="mr-2 text-blue-400">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Dimensions & Scaling */}
            {file && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold mb-4">Dimensions & Scaling</h3>
                
                {!dimensions && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-300 text-sm">
                      Extracting dimensions from file...
                    </p>
                  </div>
                )}
                
                {dimensions && (
                  <>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Original Dimensions</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Width (X)</p>
                        <p className="text-white font-semibold">{dimensions.x.toFixed(2)} mm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Depth (Y)</p>
                        <p className="text-white font-semibold">{dimensions.y.toFixed(2)} mm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Height (Z)</p>
                        <p className="text-white font-semibold">{dimensions.z.toFixed(2)} mm</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Scale Percentage</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="10"
                          max="500"
                          value={scalePercentage}
                          onChange={(e) => setScalePercentage(Math.max(10, Math.min(500, parseInt(e.target.value) || 100)))}
                          className="w-20 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-center font-semibold"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      value={scalePercentage}
                      onChange={(e) => setScalePercentage(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10%</span>
                      <span>250%</span>
                      <span>500%</span>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">Scaled Dimensions</p>
                      {scalePercentage !== 100 && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          {scalePercentage > 100 ? '+' : ''}{(scalePercentage - 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Width (X)</p>
                        <p className="text-white font-semibold">{(dimensions.x * scalePercentage / 100).toFixed(2)} mm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Depth (Y)</p>
                        <p className="text-white font-semibold">{(dimensions.y * scalePercentage / 100).toFixed(2)} mm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Height (Z)</p>
                        <p className="text-white font-semibold">{(dimensions.z * scalePercentage / 100).toFixed(2)} mm</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <label className="block text-sm font-medium mb-2">Material Type</label>
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="PLA">PLA (1.24 g/cm³)</option>
                      <option value="ABS">ABS (1.04 g/cm³)</option>
                      <option value="PETG">PETG (1.27 g/cm³)</option>
                      <option value="TPU">TPU (1.21 g/cm³)</option>
                      <option value="Nylon">Nylon (1.14 g/cm³)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">Estimated Weight</p>
                      <p className="text-xl font-bold text-white">{weightGrams.toFixed(1)}g</p>
                      <p className="text-xs text-gray-500">{(weightGrams / 28.3495).toFixed(2)} oz</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">Print Time</p>
                      <p className="text-xl font-bold text-white">
                        {Math.floor(printTimeHours)}h {Math.round((printTimeHours % 1) * 60)}m
                      </p>
                      <p className="text-xs text-gray-500">{printTimeHours.toFixed(2)} hours</p>
                    </div>
                  </div>

                  {scalePercentage !== 100 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-xs text-yellow-300">
                        <strong>Note:</strong> Volume scales cubically. At {scalePercentage}% scale, 
                        volume is {Math.pow(scalePercentage / 100, 3).toFixed(2)}× the original
                        ({scalePercentage > 100 ? 'more' : 'less'} material & time needed).
                      </p>
                    </div>
                  )}
                  </>
                  )}
              </div>
            )}
          </div>

          {/* Right Column - 3D Preview & Estimates */}
          <div className="space-y-6">
            {/* 3D Preview */}
            {file && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">3D Preview</h2>
                <ThreePreview file={file} />
              </div>
            )}

            {/* AI Estimate Loading */}
            {estimating && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-400 font-medium">Calculating cost estimate...</span>
                </div>
              </div>
            )}

            {/* AI Estimate Results */}
            {aiEstimate && !estimating && (
              <div className="space-y-6">
                {/* Main Estimate Card */}
                <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-emerald-400 mb-1">
                        {aiEstimate.estimate}
                      </h2>
                      <p className="text-sm text-gray-400">Estimated Manufacturing Cost</p>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-medium">
                      {aiEstimate.confidence} confidence
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Material</p>
                      <p className="text-white font-semibold">{aiEstimate.material}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Print Time</p>
                      <p className="text-white font-semibold">
                        {printTimeHours > 0 
                          ? `${Math.floor(printTimeHours)}h ${Math.round((printTimeHours % 1) * 60)}m`
                          : aiEstimate.printTime
                        }
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Weight</p>
                      <p className="text-white font-semibold">{weightGrams > 0 ? `${weightGrams.toFixed(1)}g` : aiEstimate.weight}</p>
                      {weightGrams > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{(weightGrams / 28.3495).toFixed(2)} oz</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manufacturing Options */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4">Manufacturing Options</h2>
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
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white">{option.name}</h3>
                              {option.recommended && (
                                <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{option.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            {option.price && (
                              <p className="text-lg font-bold text-white">{option.price}</p>
                            )}
                            {option.priceRange && (
                              <p className="text-sm font-medium text-gray-300">{option.priceRange}</p>
                            )}
                            {option.estimatedCost && (
                              <p className="text-sm font-medium text-gray-300">{option.estimatedCost}</p>
                            )}
                            {option.deliveryTime && (
                              <p className="text-xs text-gray-500">{option.deliveryTime}</p>
                            )}
                          </div>
                        </div>
                        
                        {selectedManufacturing === option.name && option.recommended && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                router.push('/login');
                                return;
                              }
                              // Store checkout data and redirect
                              sessionStorage.setItem('checkoutData', JSON.stringify({
                                type: 'manufacturing',
                                fileName: file?.name,
                                manufacturingOption: selectedManufacturing,
                                price: option.estimatedCost || option.price || option.priceRange,
                                deliveryTime: option.deliveryTime,
                                material: material,
                                scalePercentage: scalePercentage,
                                dimensions: dimensions ? `${dimensions.x}×${dimensions.y}×${dimensions.z}mm` : null,
                                weight: weightGrams,
                                printTime: printTimeHours,
                                aiEstimate: aiEstimate.estimate,
                                breakdown: aiEstimate.breakdown
                              }));
                              router.push('/checkout');
                            }}
                            disabled={loading}
                            className="w-full mt-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg font-medium transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Order with Blueprint Manufacturing
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendations */}
                {aiEstimate.recommendations && aiEstimate.recommendations.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Recommendations
                    </h2>
                    <ul className="space-y-2">
                      {aiEstimate.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-300">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!file && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <svg className="w-20 h-20 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Upload a file to get started</h3>
                <p className="text-sm text-gray-500">
                  Get instant quotes and manufacturing recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
