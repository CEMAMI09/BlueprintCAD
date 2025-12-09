/**
 * License Selection Modal
 * Allows sellers to choose which licenses to offer and set prices for each
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { X, Info, CheckCircle } from 'lucide-react';

interface LicenseType {
  code: string;
  name: string;
  description: string;
  allows_personal_print: boolean;
  allows_personal_modify: boolean;
  allows_sell_file: boolean;
  allows_sell_physical: boolean;
  allows_commercial_use: boolean;
  allows_resell_file: boolean;
  allows_bundle: boolean;
  allows_mass_manufacturing: boolean;
  no_restrictions: boolean;
}

interface LicenseSelection {
  licenseType: string;
  enabled: boolean;
  price: string;
}

interface LicenseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selections: LicenseSelection[]) => void;
  initialSelections?: LicenseSelection[];
}

export default function LicenseSelectionModal({
  isOpen,
  onClose,
  onSave,
  initialSelections = [],
}: LicenseSelectionModalProps) {
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [selections, setSelections] = useState<LicenseSelection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLicenseTypes();
      if (initialSelections.length > 0) {
        setSelections(initialSelections);
      }
    }
  }, [isOpen]);

  const fetchLicenseTypes = async () => {
    try {
      const res = await fetch('/api/licenses/types');
      if (res.ok) {
        const types = await res.json();
        setLicenseTypes(types);
        
        // Initialize selections if not provided
        if (initialSelections.length === 0) {
          setSelections(
            types.map((lt: LicenseType) => ({
              licenseType: lt.code,
              enabled: false,
              price: '',
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching license types:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLicense = (code: string) => {
    setSelections(selections.map(s => 
      s.licenseType === code 
        ? { ...s, enabled: !s.enabled }
        : s
    ));
  };

  const updatePrice = (code: string, price: string) => {
    setSelections(selections.map(s => 
      s.licenseType === code 
        ? { ...s, price }
        : s
    ));
  };

  const handleSave = () => {
    const enabledSelections = selections.filter(s => s.enabled && s.price);
    if (enabledSelections.length === 0) {
      alert('Please enable at least one license type and set a price.');
      return;
    }
    onSave(enabledSelections);
    onClose();
  };

  if (!isOpen) return null;

  const getLicenseType = (code: string) => licenseTypes.find(lt => lt.code === code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card padding="lg" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: DS.colors.text.primary }}>
            Select License Types
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} style={{ color: DS.colors.text.secondary }} />
          </button>
        </div>

        <p className="text-sm mb-6" style={{ color: DS.colors.text.secondary }}>
          Choose which license types you want to offer for this product. Buyers will be able to select from the enabled licenses.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {licenseTypes.map((licenseType) => {
              const selection = selections.find(s => s.licenseType === licenseType.code);
              const isEnabled = selection?.enabled || false;

              return (
                <div
                  key={licenseType.code}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isEnabled
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleLicense(licenseType.code)}
                      className="mt-1 w-5 h-5 rounded border-gray-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          {licenseType.name}
                        </h3>
                        {isEnabled && (
                          <Badge variant="success" size="sm">
                            <CheckCircle size={12} className="mr-1" />
                            Enabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mb-3" style={{ color: DS.colors.text.secondary }}>
                        {licenseType.description}
                      </p>

                      {/* Permissions */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        {licenseType.allows_personal_print && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Personal Print</span>
                          </div>
                        )}
                        {licenseType.allows_personal_modify && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Personal Modify</span>
                          </div>
                        )}
                        {licenseType.allows_sell_physical && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Sell Physical</span>
                          </div>
                        )}
                        {licenseType.allows_commercial_use && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Commercial Use</span>
                          </div>
                        )}
                        {licenseType.allows_resell_file && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Resell File</span>
                          </div>
                        )}
                        {licenseType.allows_bundle && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Bundle in Products</span>
                          </div>
                        )}
                        {licenseType.allows_mass_manufacturing && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>Mass Manufacturing</span>
                          </div>
                        )}
                        {licenseType.no_restrictions && (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} style={{ color: DS.colors.accent.success }} />
                            <span style={{ color: DS.colors.text.tertiary }}>No Restrictions</span>
                          </div>
                        )}
                      </div>

                      {/* Price Input */}
                      {isEnabled && (
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Price (USD) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={selection?.price || ''}
                              onChange={(e) => updatePrice(licenseType.code, e.target.value)}
                              className="w-full pl-8 pr-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="0.00"
                              required={isEnabled}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t" style={{ borderColor: DS.colors.border.subtle }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Licenses
          </Button>
        </div>
      </Card>
    </div>
  );
}

