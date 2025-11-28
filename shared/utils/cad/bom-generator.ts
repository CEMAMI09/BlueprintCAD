import * as THREE from 'three';

/**
 * Bill of Materials (BOM) Generator
 * Generates structured BOM data from assemblies with export capabilities
 */

export interface BOMItem {
  id: string;
  itemNumber: number;
  partNumber: string;
  description: string;
  quantity: number;
  material?: string;
  finish?: string;
  weight?: number; // kg
  unitCost?: number;
  totalCost?: number;
  vendor?: string;
  notes?: string;
  level: number; // Assembly hierarchy level (0 = top level)
  parentId?: string;
  thumbnail?: string; // Base64 or URL
  customFields?: { [key: string]: any };
}

export interface BOMConfiguration {
  includeSubassemblies: boolean;
  flattenHierarchy: boolean;
  includeThumbnails: boolean;
  includeWeight: boolean;
  includeCost: boolean;
  includeVendor: boolean;
  sortBy: 'itemNumber' | 'partNumber' | 'description' | 'quantity';
  sortOrder: 'asc' | 'desc';
  groupBy?: 'material' | 'vendor' | 'level' | 'none';
  showOnlyTopLevel: boolean;
  customColumns?: string[];
}

export interface BOMTitleBlock {
  projectName: string;
  projectNumber?: string;
  assemblyName: string;
  assemblyNumber?: string;
  revision: string;
  author: string;
  date: string;
  approvedBy?: string;
  approvalDate?: string;
  company?: string;
  companyLogo?: string; // Base64 or URL
  notes?: string;
  customFields?: { [key: string]: string };
}

export interface BOMSheetSettings {
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  units: 'mm' | 'in';
  fontSize: {
    title: number;
    header: number;
    body: number;
    footer: number;
  };
  colors: {
    headerBackground: string;
    headerText: string;
    alternateRow: string;
    border: string;
    text: string;
  };
  showGrid: boolean;
  showBorders: boolean;
  includePageNumbers: boolean;
  columnsPerPage?: number;
}

export interface BOMColumn {
  id: string;
  label: string;
  field: keyof BOMItem | string;
  width: number; // percentage or fixed pixels
  align: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  visible: boolean;
}

export interface BOMDocument {
  items: BOMItem[];
  titleBlock: BOMTitleBlock;
  sheetSettings: BOMSheetSettings;
  configuration: BOMConfiguration;
  columns: BOMColumn[];
  summary: {
    totalParts: number;
    uniqueParts: number;
    totalWeight?: number;
    totalCost?: number;
    generatedDate: string;
  };
}

// Default sheet settings
export const DEFAULT_SHEET_SETTINGS: BOMSheetSettings = {
  size: 'A4',
  orientation: 'landscape',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  units: 'mm',
  fontSize: { title: 16, header: 12, body: 10, footer: 8 },
  colors: {
    headerBackground: '#2c3e50',
    headerText: '#ffffff',
    alternateRow: '#f8f9fa',
    border: '#dee2e6',
    text: '#212529'
  },
  showGrid: true,
  showBorders: true,
  includePageNumbers: true
};

// Default BOM columns
export const DEFAULT_BOM_COLUMNS: BOMColumn[] = [
  { id: 'item', label: 'Item', field: 'itemNumber', width: 8, align: 'center', visible: true },
  { id: 'part', label: 'Part Number', field: 'partNumber', width: 15, align: 'left', visible: true },
  { id: 'desc', label: 'Description', field: 'description', width: 30, align: 'left', visible: true },
  { id: 'qty', label: 'Qty', field: 'quantity', width: 8, align: 'center', visible: true },
  { id: 'material', label: 'Material', field: 'material', width: 15, align: 'left', visible: true },
  { id: 'finish', label: 'Finish', field: 'finish', width: 12, align: 'left', visible: true },
  { id: 'notes', label: 'Notes', field: 'notes', width: 12, align: 'left', visible: true }
];

// Sheet size dimensions (mm)
const SHEET_SIZES: Record<string, { width: number; height: number }> = {
  'A0': { width: 841, height: 1189 },
  'A1': { width: 594, height: 841 },
  'A2': { width: 420, height: 594 },
  'A3': { width: 297, height: 420 },
  'A4': { width: 210, height: 297 },
  'Letter': { width: 215.9, height: 279.4 },
  'Legal': { width: 215.9, height: 355.6 },
  'Tabloid': { width: 279.4, height: 431.8 }
};

export class BOMGenerator {
  private items: BOMItem[] = [];
  private titleBlock: BOMTitleBlock;
  private sheetSettings: BOMSheetSettings;
  private configuration: BOMConfiguration;
  private columns: BOMColumn[];

  constructor(
    titleBlock?: Partial<BOMTitleBlock>,
    sheetSettings?: Partial<BOMSheetSettings>,
    configuration?: Partial<BOMConfiguration>
  ) {
    this.titleBlock = {
      projectName: '',
      assemblyName: '',
      revision: 'A',
      author: '',
      date: new Date().toISOString().split('T')[0],
      ...titleBlock
    };

    this.sheetSettings = {
      ...DEFAULT_SHEET_SETTINGS,
      ...sheetSettings
    };

    this.configuration = {
      includeSubassemblies: true,
      flattenHierarchy: false,
      includeThumbnails: false,
      includeWeight: true,
      includeCost: false,
      includeVendor: false,
      sortBy: 'itemNumber',
      sortOrder: 'asc',
      groupBy: 'none',
      showOnlyTopLevel: false,
      ...configuration
    };

    this.columns = [...DEFAULT_BOM_COLUMNS];
  }

  /**
   * Extract BOM from Three.js assembly
   */
  extractFromAssembly(assembly: THREE.Group, parentId?: string, level: number = 0): void {
    let itemNumber = this.items.length + 1;

    assembly.children.forEach((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        // Extract metadata from object
        const userData = (child as any).userData || {};
        
        const item: BOMItem = {
          id: child.uuid,
          itemNumber: itemNumber++,
          partNumber: userData.partNumber || `PART-${child.uuid.substring(0, 8)}`,
          description: userData.description || child.name || 'Unnamed Part',
          quantity: userData.quantity || 1,
          material: userData.material,
          finish: userData.finish,
          weight: userData.weight,
          unitCost: userData.unitCost,
          totalCost: userData.unitCost ? userData.unitCost * (userData.quantity || 1) : undefined,
          vendor: userData.vendor,
          notes: userData.notes,
          level: level,
          parentId: parentId,
          customFields: userData.customFields
        };

        // Check for duplicates and consolidate
        const existingIndex = this.items.findIndex(
          existing => existing.partNumber === item.partNumber && 
                     existing.level === item.level
        );

        if (existingIndex >= 0 && this.configuration.flattenHierarchy) {
          // Consolidate duplicate items
          this.items[existingIndex].quantity += item.quantity;
          if (this.items[existingIndex].totalCost && item.totalCost) {
            this.items[existingIndex].totalCost! += item.totalCost;
          }
        } else {
          this.items.push(item);
        }

        // Recursively process subassemblies
        if (child instanceof THREE.Group && 
            child.children.length > 0 && 
            this.configuration.includeSubassemblies) {
          this.extractFromAssembly(child, child.uuid, level + 1);
        }
      }
    });

    this.sortAndFilter();
  }

  /**
   * Add item manually
   */
  addItem(item: Partial<BOMItem>): void {
    const newItem: BOMItem = {
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemNumber: this.items.length + 1,
      partNumber: item.partNumber || 'UNKNOWN',
      description: item.description || '',
      quantity: item.quantity || 1,
      level: item.level || 0,
      ...item
    } as BOMItem;

    this.items.push(newItem);
    this.sortAndFilter();
  }

  /**
   * Sort and filter items based on configuration
   */
  private sortAndFilter(): void {
    // Filter by level
    if (this.configuration.showOnlyTopLevel) {
      this.items = this.items.filter(item => item.level === 0);
    }

    // Sort items
    this.items.sort((a, b) => {
      const field = this.configuration.sortBy;
      const aVal = a[field];
      const bVal = b[field];
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }
      
      return this.configuration.sortOrder === 'asc' ? comparison : -comparison;
    });

    // Renumber items
    this.items.forEach((item, index) => {
      item.itemNumber = index + 1;
    });
  }

  /**
   * Get grouped items
   */
  getGroupedItems(): Map<string, BOMItem[]> {
    const groups = new Map<string, BOMItem[]>();

    if (this.configuration.groupBy === 'none') {
      groups.set('all', this.items);
      return groups;
    }

    this.items.forEach(item => {
      let groupKey = 'Ungrouped';
      
      switch (this.configuration.groupBy) {
        case 'material':
          groupKey = item.material || 'No Material';
          break;
        case 'vendor':
          groupKey = item.vendor || 'No Vendor';
          break;
        case 'level':
          groupKey = `Level ${item.level}`;
          break;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    return groups;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(): BOMDocument['summary'] {
    const uniqueParts = new Set(this.items.map(item => item.partNumber)).size;
    const totalParts = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = this.items.reduce((sum, item) => 
      sum + (item.weight ? item.weight * item.quantity : 0), 0
    );
    const totalCost = this.items.reduce((sum, item) => 
      sum + (item.totalCost || 0), 0
    );

    return {
      totalParts,
      uniqueParts,
      totalWeight: totalWeight > 0 ? totalWeight : undefined,
      totalCost: totalCost > 0 ? totalCost : undefined,
      generatedDate: new Date().toISOString()
    };
  }

  /**
   * Generate complete BOM document
   */
  generateDocument(): BOMDocument {
    return {
      items: this.items,
      titleBlock: this.titleBlock,
      sheetSettings: this.sheetSettings,
      configuration: this.configuration,
      columns: this.columns,
      summary: this.calculateSummary()
    };
  }

  /**
   * Update title block
   */
  updateTitleBlock(updates: Partial<BOMTitleBlock>): void {
    this.titleBlock = { ...this.titleBlock, ...updates };
  }

  /**
   * Update sheet settings
   */
  updateSheetSettings(updates: Partial<BOMSheetSettings>): void {
    this.sheetSettings = { ...this.sheetSettings, ...updates };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<BOMConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates };
    this.sortAndFilter();
  }

  /**
   * Add or update column
   */
  updateColumn(columnId: string, updates: Partial<BOMColumn>): void {
    const index = this.columns.findIndex(col => col.id === columnId);
    if (index >= 0) {
      this.columns[index] = { ...this.columns[index], ...updates };
    }
  }

  /**
   * Get visible columns
   */
  getVisibleColumns(): BOMColumn[] {
    return this.columns.filter(col => col.visible);
  }

  /**
   * Get sheet dimensions
   */
  getSheetDimensions(): { width: number; height: number } {
    const size = SHEET_SIZES[this.sheetSettings.size];
    if (this.sheetSettings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    return size;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items = [];
  }

  /**
   * Get items count
   */
  getItemCount(): number {
    return this.items.length;
  }

  /**
   * Get item by ID
   */
  getItem(id: string): BOMItem | undefined {
    return this.items.find(item => item.id === id);
  }

  /**
   * Update item
   */
  updateItem(id: string, updates: Partial<BOMItem>): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index >= 0) {
      this.items[index] = { ...this.items[index], ...updates };
      this.sortAndFilter();
    }
  }

  /**
   * Remove item
   */
  removeItem(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
    this.sortAndFilter();
  }

  /**
   * Export to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.generateDocument(), null, 2);
  }

  /**
   * Import from JSON
   */
  fromJSON(json: string): void {
    const doc: BOMDocument = JSON.parse(json);
    this.items = doc.items;
    this.titleBlock = doc.titleBlock;
    this.sheetSettings = doc.sheetSettings;
    this.configuration = doc.configuration;
    this.columns = doc.columns;
  }

  /**
   * Export to CSV
   */
  toCSV(): string {
    const visibleColumns = this.getVisibleColumns();
    const headers = visibleColumns.map(col => col.label).join(',');
    const rows = this.items.map(item => {
      return visibleColumns.map(col => {
        const value = item[col.field as keyof BOMItem];
        const formatted = col.format ? col.format(value) : value;
        // Escape commas and quotes for CSV
        const strValue = String(formatted || '');
        return strValue.includes(',') || strValue.includes('"') 
          ? `"${strValue.replace(/"/g, '""')}"` 
          : strValue;
      }).join(',');
    }).join('\n');

    return `${headers}\n${rows}`;
  }
}
