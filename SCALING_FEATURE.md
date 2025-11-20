# CAD File Scaling Feature - Implementation Summary

## Overview
Implemented comprehensive scaling functionality for STL CAD files with dynamic dimension extraction, weight calculation, and print time estimation.

## Features Implemented

### 1. **Dimension Extraction**
- **File**: `lib/stl-utils.js`
- Automatically extracts dimensions (W×H×D in mm) from STL files
- Supports both binary and ASCII STL formats
- Calculates bounding box volume
- Parses vertex data to determine min/max coordinates

### 2. **Scaling Control**
- **File**: `app/upload/page.tsx`
- Interactive slider (10% - 500% range)
- Manual input field for precise percentage
- Real-time dimension updates
- Shows both original and scaled dimensions

### 3. **Weight Calculation**
- Supports multiple materials:
  - PLA: 1.24 g/cm³
  - ABS: 1.04 g/cm³
  - PETG: 1.27 g/cm³
  - TPU: 1.21 g/cm³
  - Nylon: 1.14 g/cm³
- Calculates based on:
  - Scaled volume (cubic scaling)
  - Material density
  - 20% infill assumption
  - Shell walls (~15%)
- Displays in both **grams** and **ounces**

### 4. **Print Time Estimation**
- Based on:
  - Scaled Z height (number of layers)
  - Layer height (0.2mm default)
  - Print speed (50 mm/s default)
  - Perimeter length
  - Infill path length
- Adds 15% overhead for travel moves
- Displays in hours and minutes

### 5. **Dynamic Price Recalculation**
- **File**: `pages/api/projects/estimate.js`
- AI estimate scales with volume multiplier
- Material cost scales cubically with scale percentage
- Machine time scales with volume
- Updates all manufacturing options dynamically

### 6. **Database Storage**
- **Migration**: `scripts/add-project-dimensions.js`
- New columns in `projects` table:
  - `dimensions` (TEXT) - "WxHxD mm" format
  - `scale_percentage` (INTEGER, default 100)
  - `weight_grams` (REAL)
  - `print_time_hours` (REAL)

### 7. **Project Display**
- **File**: `app/project/[id]/page.tsx`
- Shows dimensions, scale, weight, and print time
- Displays weight in both units
- Formats print time as "Xh Ym"
- New "Specifications" card on project page

## How It Works

### Upload Flow:
1. User uploads STL file
2. API extracts dimensions using `stl-utils.js`
3. Returns dimensions and volume to frontend
4. Frontend displays original dimensions
5. User adjusts scale percentage (100% default)
6. Weight and print time calculate automatically
7. AI estimate recalculates with scale factor
8. On submit, stores all data in database

### Scaling Math:
```javascript
// Linear dimensions scale linearly
scaledWidth = originalWidth × (scale / 100)

// Volume scales CUBICALLY
volumeMultiplier = (scale / 100)³
scaledVolume = originalVolume × volumeMultiplier

// Weight scales with volume
weight = volume × density × infillFactor

// Print time scales with volume
printTime = baseTime × volumeMultiplier
```

### Example:
- Original: 100mm × 100mm × 100mm
- Scale to 120%:
  - New dimensions: 120mm × 120mm × 120mm
  - Volume multiplier: 1.2³ = 1.728× (72.8% more material)
  - If original weight was 100g → scaled weight = 172.8g
  - If original print time was 2 hours → scaled time = 3.46 hours

## UI Components

### Dimensions Card:
- Original dimensions (W×H×D)
- Scale slider (10% - 500%)
- Percentage input field
- Scaled dimensions with badge showing change
- Material selector dropdown

### Weight & Time Display:
- Purple gradient card for weight
  - Shows grams (primary)
  - Shows ounces (secondary)
- Blue gradient card for print time
  - Shows hours and minutes
  - Shows decimal hours

### Volume Multiplier Info:
- Yellow info box appears when scale ≠ 100%
- Explains cubic scaling relationship
- Shows exact volume multiplier

## Files Modified

### New Files:
- `lib/stl-utils.js` - STL parsing and calculations
- `scripts/add-project-dimensions.js` - Database migration

### Modified Files:
- `pages/api/upload.js` - Extract dimensions on upload
- `pages/api/projects/estimate.js` - Scale-aware AI estimates
- `pages/api/projects/index.js` - Save dimensions/weight/time
- `app/upload/page.tsx` - Scaling UI and calculations
- `app/project/[id]/page.tsx` - Display specifications

## Key Features

✅ Automatic dimension extraction from STL files
✅ Real-time scaling with interactive slider
✅ Material-aware weight calculation
✅ Print time estimation
✅ Weight displayed in grams AND ounces
✅ Dynamic AI price recalculation
✅ Cubic volume scaling (accurate material usage)
✅ Supports 5 common 3D printing materials
✅ Stores all data in database
✅ Displays on project detail page

## Usage

1. **Upload STL file** - Dimensions automatically extracted
2. **Adjust scale** - Use slider or input field (10% - 500%)
3. **Select material** - Choose from PLA, ABS, PETG, TPU, or Nylon
4. **Review metrics** - Weight updates in g/oz, print time recalculates
5. **Check price** - AI estimate adjusts for scaled volume
6. **Submit** - All data saved to project

## Technical Notes

- Dimensions only extracted for STL files (most common 3D printing format)
- Weight calculation assumes 20% infill (industry standard)
- Print time uses conservative 50mm/s speed
- Volume scaling is cubic (doubling size = 8× material)
- All calculations happen client-side after initial extraction
- AI estimates recalculate on scale changes (with debouncing via useEffect)

## Future Enhancements

- Support for OBJ/FBX dimension extraction
- Custom infill percentage selection
- Multiple print speed presets
- Material cost breakdown by filament brand
- Support structure weight estimation
- Layer-by-layer time estimation
- Print cost calculator with electricity costs
