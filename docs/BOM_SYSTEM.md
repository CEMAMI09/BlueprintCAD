# Bill of Materials (BOM) System

## Overview

The BOM system provides comprehensive Bill of Materials generation for CAD assemblies with professional export capabilities. It supports hierarchical BOMs, customizable formatting, and exports to multiple formats including PDF, SVG, DXF, and CSV.

## Features

### 1. BOM Generation
- **Automatic Extraction**: Extract BOM from Three.js assemblies
- **Hierarchical Structure**: Support for subassemblies with indentation
- **Duplicate Consolidation**: Option to flatten hierarchy and consolidate identical parts
- **Metadata Extraction**: Part numbers, descriptions, materials, finishes, weights, costs

### 2. Customizable Columns
- Item Number
- Part Number
- Description
- Quantity
- Material
- Finish
- Weight (kg)
- Unit Cost
- Total Cost
- Vendor
- Notes
- Custom Fields

### 3. Configuration Options
- **Include Subassemblies**: Show/hide nested assemblies
- **Flatten Hierarchy**: Consolidate duplicate parts
- **Sorting**: By item number, part number, description, or quantity
- **Grouping**: By material, vendor, or hierarchy level
- **Filtering**: Show only top-level parts

### 4. Title Block
Complete title block support:
- Project Name & Number
- Assembly Name & Number
- Revision
- Author
- Date
- Approval Information
- Company Information
- Company Logo
- Custom Fields

### 5. Sheet Settings
Professional formatting:
- **Sheet Sizes**: A0-A4, Letter, Legal, Tabloid
- **Orientation**: Portrait or Landscape
- **Margins**: Customizable margins (mm or inches)
- **Fonts**: Title, header, body, footer font sizes
- **Colors**: Header background, text, borders, alternating rows
- **Grid Options**: Show/hide grid lines and borders
- **Page Numbers**: Optional page numbering

### 6. Export Formats

#### PDF Export
- Professional multi-page layout
- Title block on every page
- Proper table formatting with headers
- Alternating row colors
- Page numbers
- Summary statistics in footer
- Vector graphics (scalable)

#### SVG Export
- Scalable vector graphics
- Web-compatible format
- Full table rendering
- Text as paths for font compatibility
- Proper XML structure

#### DXF Export
- CAD-compatible format
- Text entities for all data
- Layer organization
- Rectangle borders
- Compatible with AutoCAD, SolidWorks, etc.

#### CSV Export
- Spreadsheet-compatible
- All visible columns
- Proper comma/quote escaping
- Import into Excel, Google Sheets, etc.

## Usage

### Generating a BOM

```typescript
import { BOMGenerator } from '@/lib/cad/bom-generator';

// Create generator with title block
const generator = new BOMGenerator({
  projectName: 'My Project',
  assemblyName: 'Main Assembly',
  revision: 'A',
  author: 'John Doe',
  date: '2025-11-20'
});

// Extract from Three.js assembly
generator.extractFromAssembly(assemblyGroup);

// Get document
const bomDocument = generator.generateDocument();
```

### Manual Item Entry

```typescript
generator.addItem({
  partNumber: 'BOLT-M8-20',
  description: 'M8x20 Hex Bolt',
  quantity: 12,
  material: 'Steel',
  finish: 'Zinc Plated',
  weight: 0.015,
  unitCost: 0.25
});
```

### Configuration

```typescript
generator.updateConfiguration({
  includeSubassemblies: true,
  flattenHierarchy: false,
  sortBy: 'itemNumber',
  sortOrder: 'asc',
  groupBy: 'material'
});
```

### Sheet Settings

```typescript
generator.updateSheetSettings({
  size: 'A4',
  orientation: 'landscape',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  colors: {
    headerBackground: '#2c3e50',
    headerText: '#ffffff',
    alternateRow: '#f8f9fa'
  }
});
```

### Exporting

```typescript
import { BOMPDFExporter, BOMSVGExporter, BOMDXFExporter } from '@/lib/cad/bom-exporters';

// Export to PDF
BOMPDFExporter.exportToPDF(bomDocument, 'assembly-bom.pdf');

// Export to SVG
BOMSVGExporter.exportToSVG(bomDocument, 'assembly-bom.svg');

// Export to DXF
BOMDXFExporter.exportToDXF(bomDocument, 'assembly-bom.dxf');

// Export to CSV
const csv = generator.toCSV();
```

## BOM Editor UI

### Main Features
- **Interactive Table**: Sort, filter, select items
- **Inline Editing**: Edit part details directly
- **Bulk Operations**: Select multiple items for deletion
- **Summary Statistics**: Total parts, unique parts, weight, cost
- **Export Buttons**: One-click export to all formats
- **Dark/Light Mode**: Accessible UI theme

### Keyboard Shortcuts
- **Ctrl+Click**: Multi-select items
- **Ctrl+A**: Select all items
- **Delete**: Remove selected items

### Item Editor
Edit all item properties:
- Part Number
- Description
- Quantity
- Material
- Finish
- Weight (kg)
- Unit Cost ($)
- Vendor
- Notes

## API Reference

### BOMGenerator Class

```typescript
class BOMGenerator {
  constructor(
    titleBlock?: Partial<BOMTitleBlock>,
    sheetSettings?: Partial<BOMSheetSettings>,
    configuration?: Partial<BOMConfiguration>
  )

  // Methods
  extractFromAssembly(assembly: THREE.Group, parentId?: string, level?: number): void
  addItem(item: Partial<BOMItem>): void
  updateItem(id: string, updates: Partial<BOMItem>): void
  removeItem(id: string): void
  getItem(id: string): BOMItem | undefined
  getItemCount(): number
  
  updateTitleBlock(updates: Partial<BOMTitleBlock>): void
  updateSheetSettings(updates: Partial<BOMSheetSettings>): void
  updateConfiguration(updates: Partial<BOMConfiguration>): void
  updateColumn(columnId: string, updates: Partial<BOMColumn>): void
  
  getVisibleColumns(): BOMColumn[]
  getGroupedItems(): Map<string, BOMItem[]>
  getSheetDimensions(): { width: number; height: number }
  calculateSummary(): BOMDocument['summary']
  generateDocument(): BOMDocument
  
  toJSON(): string
  fromJSON(json: string): void
  toCSV(): string
  
  clear(): void
}
```

### BOM Data Structures

```typescript
interface BOMItem {
  id: string;
  itemNumber: number;
  partNumber: string;
  description: string;
  quantity: number;
  material?: string;
  finish?: string;
  weight?: number;
  unitCost?: number;
  totalCost?: number;
  vendor?: string;
  notes?: string;
  level: number;
  parentId?: string;
  thumbnail?: string;
  customFields?: { [key: string]: any };
}

interface BOMTitleBlock {
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
  companyLogo?: string;
  notes?: string;
  customFields?: { [key: string]: string };
}

interface BOMSheetSettings {
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  units: 'mm' | 'in';
  fontSize: { title: number; header: number; body: number; footer: number };
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
}

interface BOMConfiguration {
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
```

## Integration with Assemblies

### Adding Metadata to Parts

```typescript
// Add BOM metadata to meshes
mesh.userData = {
  partNumber: 'SHAFT-001',
  description: 'Main Drive Shaft',
  material: 'Steel 1045',
  finish: 'Heat Treated',
  quantity: 1,
  weight: 2.5,
  unitCost: 45.00,
  vendor: 'McMaster-Carr',
  notes: 'Tolerance: ±0.01mm'
};
```

### Hierarchical Assemblies

```typescript
const mainAssembly = new THREE.Group();
mainAssembly.name = 'Main Assembly';

const subAssembly1 = new THREE.Group();
subAssembly1.name = 'Motor Assembly';
subAssembly1.userData = {
  partNumber: 'ASM-MOTOR-001',
  description: 'Electric Motor Assembly',
  quantity: 1
};

mainAssembly.add(subAssembly1);

// BOM will show hierarchy:
// 1. Main Assembly
//   1.1 Motor Assembly
//     1.1.1 Motor Housing
//     1.1.2 Motor Shaft
//     1.1.3 Bearings (qty: 2)
```

## Best Practices

### Part Numbering
- Use consistent format: `PREFIX-NUMBER-SUFFIX`
- Example: `BOLT-M8-20`, `PLATE-STEEL-001`
- Include revision in part number if needed

### Descriptions
- Be specific and concise
- Include key specifications
- Example: "M8x20 Hex Bolt, Grade 8.8"

### Materials
- Use standard material names
- Include grades when relevant
- Example: "Steel 1045", "Aluminum 6061-T6"

### Quantities
- Set quantity on parts, not in part number
- Use consolidation for duplicate parts
- Update totals when assemblies are reused

### Weights
- Always include units (kg recommended)
- Calculate from CAD models when possible
- Include fastener weights

### Costs
- Keep cost data up-to-date
- Use unit costs, not total costs
- Total cost calculated automatically

## Troubleshooting

### Items Not Appearing
- Check that mesh has `userData` properties
- Verify assembly structure is correct
- Enable `includeSubassemblies` if using nested groups

### Duplicate Items
- Enable `flattenHierarchy` to consolidate
- Check part numbers are identical
- Verify level matching for consolidation

### Export Issues
- **PDF**: Ensure jsPDF library is loaded
- **SVG**: Check for special characters in text
- **DXF**: Verify DXF viewer supports AutoCAD 2000 format
- **CSV**: Check for commas in part descriptions

### Performance
- Large assemblies (>1000 parts) may be slow
- Use grouping to organize large BOMs
- Consider splitting into multiple sheets

## Examples

### Simple Assembly BOM

```typescript
// Create simple 3-part assembly
const generator = new BOMGenerator({
  assemblyName: 'Simple Bracket',
  revision: 'A',
  author: 'Engineer'
});

generator.addItem({
  partNumber: 'BRACKET-MAIN',
  description: 'Main Bracket Plate',
  quantity: 1,
  material: 'Aluminum 6061',
  weight: 0.5
});

generator.addItem({
  partNumber: 'BOLT-M6-15',
  description: 'M6x15 Socket Head Cap Screw',
  quantity: 4,
  material: 'Steel',
  weight: 0.01
});

generator.addItem({
  partNumber: 'WASHER-M6',
  description: 'M6 Flat Washer',
  quantity: 4,
  material: 'Steel',
  weight: 0.002
});

const doc = generator.generateDocument();
BOMPDFExporter.exportToPDF(doc);
```

### Complex Hierarchical BOM

```typescript
const generator = new BOMGenerator({
  assemblyName: 'Robotic Arm',
  revision: 'B',
  author: 'Robotics Team'
}, undefined, {
  includeSubassemblies: true,
  flattenHierarchy: false,
  includeWeight: true,
  includeCost: true
});

// Extract from Three.js assembly with nested groups
generator.extractFromAssembly(roboticArmAssembly);

// Customize columns
generator.updateColumn('material', { visible: true });
generator.updateColumn('vendor', { visible: true });

// Export multiple formats
const doc = generator.generateDocument();
BOMPDFExporter.exportToPDF(doc, 'robotic-arm-bom.pdf');
BOMSVGExporter.exportToSVG(doc, 'robotic-arm-bom.svg');
BOMDXFExporter.exportToDXF(doc, 'robotic-arm-bom.dxf');

// Also export CSV for spreadsheet
const csv = generator.toCSV();
```

## Future Enhancements

- [ ] Thumbnail generation from 3D models
- [ ] BOM comparison (before/after changes)
- [ ] Where-used analysis
- [ ] Cost rollup calculations
- [ ] Material takeoff reports
- [ ] ERP system integration
- [ ] Barcode/QR code generation
- [ ] Multi-language support
- [ ] Templates library
- [ ] Revision history tracking
- [ ] Approval workflow
- [ ] Digital signatures

## License

Part of the Blueprint CAD system. See main LICENSE file for details.
