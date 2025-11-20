/**
 * Quote/Upload Page - Get Manufacturing Quote
 * Upload CAD file, get AI estimate, view 3D preview, choose manufacturing options
 */

'use client';

import { useState, useEffect } from 'react';
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
import { DesignSystem as DS } from '@/lib/ui/design-system';
import ThreePreview from '@/components/ThreePreview';
import {
  Upload,
  FileUp,
  Sparkles,
  DollarSign,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
} from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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

  const handleFileChange = (selectedFile: File) => {
    const validExtensions = ['.stl', '.obj', '.step', '.stp', '.iges', '.igs', '.fbx', '.3mf'];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setError('Please upload a valid CAD file (STL, OBJ, STEP, IGES, FBX, or 3MF)');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
      setError('File size must be less than 100MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    setAiEstimate(null);
  };

  const handleGetEstimate = async () => {
    if (!file) return;

    setEstimating(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/projects/estimate', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAiEstimate(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to get estimate');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setEstimating(false);
    }
  };

  const handleSaveProject = async () => {
    if (!file || !user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('description', '');

      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/project/${data.projectId}`);
      } else {
        setError('Failed to save project');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader 
            title="Get Manufacturing Quote"
            actions={
              file && (
                <Button variant="primary" onClick={handleSaveProject} disabled={loading}>
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
                    className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                      dragActive ? 'border-blue-400 bg-blue-50' : ''
                    }`}
                    style={{
                      borderColor: dragActive ? DS.colors.primary.blue : DS.colors.border.default,
                      backgroundColor: dragActive ? DS.colors.primary.blue + '10' : 'transparent'
                    }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload size={64} style={{ color: DS.colors.text.tertiary, margin: '0 auto 1rem' }} />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                      Upload Your CAD File
                    </h3>
                    <p className="text-base mb-6" style={{ color: DS.colors.text.secondary }}>
                      Drag and drop your file here, or click to browse
                    </p>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".stl,.obj,.step,.stp,.iges,.igs,.fbx,.3mf"
                      onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    />
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'inline-block' }}>
                        <Button variant="primary" icon={<FileUp size={18} />}>
                          Choose File
                        </Button>
                      </div>
                    </label>
                    <p className="text-sm mt-4" style={{ color: DS.colors.text.tertiary }}>
                      Supported formats: STL, OBJ, STEP, IGES, FBX, 3MF (Max 100MB)
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {/* File Preview */}
                  <Card padding="lg" className="mb-6">
                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                          {file.name}
                        </h3>
                        <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                          Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button 
                          variant="secondary" 
                          icon={<Sparkles size={18} />} 
                          onClick={handleGetEstimate}
                          disabled={estimating}
                        >
                          {estimating ? 'Analyzing...' : 'Get AI Estimate'}
                        </Button>
                      </div>
                      
                      {/* 3D Preview */}
                      <div 
                        className="w-80 h-80 rounded-lg overflow-hidden"
                        style={{ backgroundColor: DS.colors.background.panel }}
                      >
                        <ThreePreview file={file} />
                      </div>
                    </div>

                    {error && (
                      <div 
                        className="mt-4 p-3 rounded-lg flex items-center gap-2"
                        style={{ backgroundColor: DS.colors.accent.error + '20' }}
                      >
                        <AlertCircle size={20} style={{ color: DS.colors.accent.error }} />
                        <span style={{ color: DS.colors.accent.error }}>{error}</span>
                      </div>
                    )}
                  </Card>

                  {/* AI Estimate Results */}
                  {aiEstimate && (
                    <>
                      {/* Cost Breakdown */}
                      <Card padding="lg" className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles size={24} style={{ color: DS.colors.primary.blue }} />
                          <h3 className="text-xl font-semibold" style={{ color: DS.colors.text.primary }}>
                            AI Cost Estimate
                          </h3>
                          <Badge variant="success" size="sm">{aiEstimate.confidence} confidence</Badge>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div>
                            <div className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>Total Estimate</div>
                            <div className="text-2xl font-bold" style={{ color: DS.colors.primary.blue }}>
                              {aiEstimate.estimate}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>Material</div>
                            <div className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                              {aiEstimate.material}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>Print Time</div>
                            <div className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                              {aiEstimate.printTime}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>Weight</div>
                            <div className="text-lg font-semibold" style={{ color: DS.colors.text.primary }}>
                              {aiEstimate.weight}
                            </div>
                          </div>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="border-t pt-4" style={{ borderColor: DS.colors.border.default }}>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                            Cost Breakdown
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span style={{ color: DS.colors.text.secondary }}>Material Cost</span>
                              <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.materialCost}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span style={{ color: DS.colors.text.secondary }}>Labor Cost</span>
                              <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.laborCost}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span style={{ color: DS.colors.text.secondary }}>Machine Time</span>
                              <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.machineTime}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span style={{ color: DS.colors.text.secondary }}>Markup</span>
                              <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.markup}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span style={{ color: DS.colors.text.secondary }}>Shipping</span>
                              <span style={{ color: DS.colors.text.primary }}>{aiEstimate.breakdown.shipping}</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Manufacturing Options */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                          Manufacturing Options
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {aiEstimate.manufacturingOptions.map((option, index) => (
                            <Card 
                              key={index}
                              hover
                              padding="md"
                              style={{ 
                                cursor: 'pointer',
                                borderColor: option.recommended ? DS.colors.primary.blue : DS.colors.border.default,
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                                      {option.name}
                                    </h4>
                                    {option.recommended && <Badge variant="primary" size="sm">Recommended</Badge>}
                                  </div>
                                  <p className="text-sm mb-3" style={{ color: DS.colors.text.secondary }}>
                                    {option.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                                    {option.deliveryTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {option.deliveryTime}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold" style={{ color: DS.colors.primary.blue }}>
                                    {option.price || option.priceRange}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations */}
                      {aiEstimate.recommendations.length > 0 && (
                        <Card padding="md">
                          <div className="flex items-start gap-3">
                            <Info size={20} style={{ color: DS.colors.primary.blue, flexShrink: 0, marginTop: '2px' }} />
                            <div className="flex-1">
                              <h4 className="font-semibold mb-2" style={{ color: DS.colors.text.primary }}>
                                Recommendations
                              </h4>
                              <ul className="space-y-1 text-sm" style={{ color: DS.colors.text.secondary }}>
                                {aiEstimate.recommendations.map((rec, index) => (
                                  <li key={index}>• {rec}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </Card>
                      )}
                    </>
                  )}
                </>
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
                <Button variant="primary" icon={<Sparkles size={18} />} className="w-full" onClick={handleGetEstimate} disabled={estimating}>
                  Get Estimate
                </Button>
                <Button variant="secondary" icon={<Package size={18} />} className="w-full" onClick={handleSaveProject} disabled={loading}>
                  Save to Projects
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => {
                    setFile(null);
                    setAiEstimate(null);
                    setError('');
                  }}
                >
                  Upload Different File
                </Button>
              </div>

              {aiEstimate && (
                <>
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                    <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      File Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Format</span>
                        <span style={{ color: DS.colors.text.primary }}>
                          {file.name.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Size</span>
                        <span style={{ color: DS.colors.text.primary }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Material</span>
                        <span style={{ color: DS.colors.text.primary }}>{aiEstimate.material}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Weight</span>
                        <span style={{ color: DS.colors.text.primary }}>{aiEstimate.weight}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </RightPanel>
        )
      }
    />
  );
}
