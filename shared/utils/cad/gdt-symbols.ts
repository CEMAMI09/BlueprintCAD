/**
 * Geometric Dimensioning and Tolerancing (GD&T) Symbol Library
 * Based on ASME Y14.5-2018 and ISO 1101 standards
 */

export type GDTSymbolType =
  // Form Controls
  | 'straightness'
  | 'flatness'
  | 'circularity'
  | 'cylindricity'
  // Orientation Controls
  | 'angularity'
  | 'perpendicularity'
  | 'parallelism'
  // Location Controls
  | 'position'
  | 'concentricity'
  | 'symmetry'
  // Runout Controls
  | 'circular_runout'
  | 'total_runout'
  // Profile Controls
  | 'profile_surface'
  | 'profile_line'
  // Modifiers
  | 'mmc' // Maximum Material Condition
  | 'lmc' // Least Material Condition
  | 'rfs' // Regardless of Feature Size
  | 'datum_target'
  | 'datum_feature'
  | 'free_state'
  | 'tangent_plane'
  | 'statistical_tolerance'
  | 'between'
  | 'all_around'
  | 'all_over';

export interface GDTFeatureControlFrame {
  id: string;
  type: 'feature_control';
  symbol: GDTSymbolType;
  tolerance: number;
  modifiers?: GDTSymbolType[];
  primaryDatum?: string;
  secondaryDatum?: string;
  tertiaryDatum?: string;
  position: { x: number; y: number };
  leaderPoint?: { x: number; y: number };
}

export interface DatumFeature {
  id: string;
  type: 'datum';
  label: string; // A, B, C, etc.
  position: { x: number; y: number };
  targetPoints?: Array<{ x: number; y: number }>;
}

export interface SurfaceFinishSymbol {
  id: string;
  type: 'surface_finish';
  roughness: number; // Ra value in micrometers
  machiningAllowed: boolean;
  machiningRequired: boolean;
  layDirection?: 'parallel' | 'perpendicular' | 'crossed' | 'multidirectional' | 'circular' | 'radial';
  position: { x: number; y: number };
}

/**
 * GD&T Symbol Unicode mappings and SVG paths
 */
export const GDT_SYMBOLS = {
  // Form Controls
  straightness: {
    unicode: '⏤',
    svg: 'M2,8 L14,8',
    description: 'Straightness - Controls the straightness of a line element'
  },
  flatness: {
    unicode: '⏥',
    svg: 'M2,6 L14,6 M2,10 L14,10',
    description: 'Flatness - Controls the flatness of a surface'
  },
  circularity: {
    unicode: '○',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0',
    description: 'Circularity/Roundness - Controls the circularity of a feature'
  },
  cylindricity: {
    unicode: '⌭',
    svg: 'M4,4 L4,12 M12,4 L12,12 M4,4 A4,2 0 0,1 12,4 M4,12 A4,2 0 0,0 12,12',
    description: 'Cylindricity - Controls the cylindrical form of a feature'
  },

  // Orientation Controls
  angularity: {
    unicode: '∠',
    svg: 'M2,12 L8,2 L14,12',
    description: 'Angularity - Controls the angular orientation of a feature'
  },
  perpendicularity: {
    unicode: '⊥',
    svg: 'M8,2 L8,14 M4,14 L12,14',
    description: 'Perpendicularity - Controls perpendicular orientation to a datum'
  },
  parallelism: {
    unicode: '∥',
    svg: 'M4,4 L4,12 M10,4 L10,12',
    description: 'Parallelism - Controls parallel orientation to a datum'
  },

  // Location Controls
  position: {
    unicode: '⊕',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M8,2 L8,14 M2,8 L14,8',
    description: 'Position - Controls the location of a feature'
  },
  concentricity: {
    unicode: '◎',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M8,8 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
    description: 'Concentricity - Controls the coaxial relationship of features'
  },
  symmetry: {
    unicode: '⌯',
    svg: 'M2,2 L8,8 L2,14 M14,2 L8,8 L14,14 M8,2 L8,14',
    description: 'Symmetry - Controls symmetrical relationship to a datum'
  },

  // Runout Controls
  circular_runout: {
    unicode: '↗',
    svg: 'M2,12 L6,12 L12,6 M9,3 L12,6 L9,9',
    description: 'Circular Runout - Controls circular elements during rotation'
  },
  total_runout: {
    unicode: '⤢',
    svg: 'M2,12 L6,12 L12,6 M9,3 L12,6 L9,9 M2,9 L6,9 L9,6',
    description: 'Total Runout - Controls entire surface during rotation'
  },

  // Profile Controls
  profile_surface: {
    unicode: '⌓',
    svg: 'M2,10 Q5,4 8,8 T14,8',
    description: 'Profile of a Surface - Controls the profile of an entire surface'
  },
  profile_line: {
    unicode: '⌒',
    svg: 'M2,8 Q8,2 14,8',
    description: 'Profile of a Line - Controls the profile of a line element'
  },

  // Modifiers
  mmc: {
    unicode: 'Ⓜ',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M5,6 L5,10 L6.5,8 L8,10 L8,6 M9,6 L9,10 L10.5,8 L12,10 L12,6',
    description: 'Maximum Material Condition - Modifier for tolerance at MMC'
  },
  lmc: {
    unicode: 'Ⓛ',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M6,6 L6,10 L9,10 M10,6 L10,10 M10,6 L12,6 M10,10 L12,10',
    description: 'Least Material Condition - Modifier for tolerance at LMC'
  },
  rfs: {
    unicode: 'Ⓢ',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M6,7 Q6,6 7,6 L9,6 Q10,6 10,7 Q10,8 9,8 L7,8 M7,8 L9,10 Q10,10 10,9',
    description: 'Regardless of Feature Size - Default modifier'
  },
  datum_target: {
    unicode: '⊗',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M3,3 L13,13 M3,13 L13,3',
    description: 'Datum Target - Identifies a datum target point, line, or area'
  },
  free_state: {
    unicode: 'Ⓕ',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M6,6 L6,10 M6,6 L10,6 M6,8 L9,8',
    description: 'Free State - Tolerance applies in free state'
  },
  tangent_plane: {
    unicode: 'Ⓣ',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M5,6 L11,6 M8,6 L8,10',
    description: 'Tangent Plane - Tolerance applies to tangent plane'
  },
  statistical_tolerance: {
    unicode: 'ST',
    svg: 'M6,7 Q6,6 7,6 L9,6 Q10,6 10,7 Q10,8 9,8 L7,8 M7,8 L9,10 Q10,10 10,9 M11,6 L11,10 M11,6 L13,6',
    description: 'Statistical Tolerance - Tolerance uses statistical process control'
  },
  between: {
    unicode: '↔',
    svg: 'M2,8 L14,8 M2,5 L5,8 L2,11 M14,5 L11,8 L14,11',
    description: 'Between - Applies between specified features'
  },
  all_around: {
    unicode: '⊚',
    svg: 'M8,8 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M8,8 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 M8,2 m-1,0 a1,1 0 1,0 2,0 a1,1 0 1,0 -2,0',
    description: 'All Around - Applies all around the profile'
  },
  all_over: {
    unicode: 'AO',
    svg: 'M4,6 L6,10 L8,6 M9,6 L9,10 Q9,10 11,10 Q13,10 13,8 Q13,6 11,6 Q9,6 9,8',
    description: 'All Over - Applies to all surfaces'
  }
};

/**
 * Standard datum labels A-Z
 */
export const DATUM_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Surface finish lay direction symbols
 */
export const SURFACE_FINISH_LAY = {
  parallel: '=',
  perpendicular: '⊥',
  crossed: 'X',
  multidirectional: 'M',
  circular: 'C',
  radial: 'R'
};

/**
 * Draw GD&T feature control frame on canvas
 */
export function drawFeatureControlFrame(
  ctx: CanvasRenderingContext2D,
  frame: GDTFeatureControlFrame,
  scale: number,
  darkMode: boolean
) {
  const boxHeight = 8 * scale;
  const boxWidth = 20 * scale;
  const symbolSize = 6 * scale;

  ctx.save();
  ctx.translate(frame.position.x * scale, frame.position.y * scale);

  // Draw leader if specified
  if (frame.leaderPoint) {
    ctx.strokeStyle = darkMode ? '#ffffff' : '#000000';
    ctx.lineWidth = 0.3 * scale;
    ctx.beginPath();
    ctx.moveTo(0, boxHeight / 2);
    ctx.lineTo(
      (frame.leaderPoint.x - frame.position.x) * scale,
      (frame.leaderPoint.y - frame.position.y) * scale
    );
    ctx.stroke();
  }

  // Frame border
  ctx.strokeStyle = darkMode ? '#ffffff' : '#000000';
  ctx.lineWidth = 0.5 * scale;
  ctx.strokeRect(0, 0, boxWidth * 4, boxHeight);

  // Compartments
  ctx.beginPath();
  ctx.moveTo(boxWidth, 0);
  ctx.lineTo(boxWidth, boxHeight);
  ctx.moveTo(boxWidth * 2, 0);
  ctx.lineTo(boxWidth * 2, boxHeight);
  ctx.moveTo(boxWidth * 3, 0);
  ctx.lineTo(boxWidth * 3, boxHeight);
  ctx.stroke();

  // Symbol (compartment 1)
  ctx.font = `${symbolSize}px Arial`;
  ctx.fillStyle = darkMode ? '#ffffff' : '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const symbol = GDT_SYMBOLS[frame.symbol];
  ctx.fillText(symbol.unicode, boxWidth / 2, boxHeight / 2);

  // Tolerance (compartment 2)
  ctx.fillText(`${frame.tolerance}`, boxWidth * 1.5, boxHeight / 2);

  // Primary datum (compartment 3)
  if (frame.primaryDatum) {
    ctx.fillText(frame.primaryDatum, boxWidth * 2.5, boxHeight / 2);
  }

  // Secondary datum (compartment 4)
  if (frame.secondaryDatum) {
    ctx.fillText(frame.secondaryDatum, boxWidth * 3.5, boxHeight / 2);
  }

  ctx.restore();
}

/**
 * Draw datum feature symbol on canvas
 */
export function drawDatumFeature(
  ctx: CanvasRenderingContext2D,
  datum: DatumFeature,
  scale: number,
  darkMode: boolean
) {
  const boxSize = 8 * scale;

  ctx.save();
  ctx.translate(datum.position.x * scale, datum.position.y * scale);

  // Datum triangle
  ctx.strokeStyle = darkMode ? '#ffffff' : '#000000';
  ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
  ctx.lineWidth = 0.5 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-boxSize / 2, boxSize);
  ctx.lineTo(boxSize / 2, boxSize);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Datum label box
  ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
  ctx.strokeRect(-boxSize / 2, boxSize, boxSize, boxSize);
  ctx.fillRect(-boxSize / 2, boxSize, boxSize, boxSize);

  // Datum label
  ctx.fillStyle = darkMode ? '#ffffff' : '#000000';
  ctx.font = `bold ${6 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(datum.label, 0, boxSize * 1.5);

  ctx.restore();
}

/**
 * Draw surface finish symbol on canvas
 */
export function drawSurfaceFinish(
  ctx: CanvasRenderingContext2D,
  finish: SurfaceFinishSymbol,
  scale: number,
  darkMode: boolean
) {
  const width = 12 * scale;
  const height = 10 * scale;

  ctx.save();
  ctx.translate(finish.position.x * scale, finish.position.y * scale);

  ctx.strokeStyle = darkMode ? '#ffffff' : '#000000';
  ctx.lineWidth = 0.5 * scale;

  // Basic symbol shape
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.3, height * 0.5);
  ctx.lineTo(0, height);
  ctx.stroke();

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.5);
  ctx.lineTo(width, height * 0.5);
  ctx.stroke();

  // Machining indicators
  if (!finish.machiningAllowed) {
    // Circle = no machining
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.25, 2 * scale, 0, Math.PI * 2);
    ctx.stroke();
  } else if (finish.machiningRequired) {
    // Line = machining required
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.15);
    ctx.lineTo(width * 0.2, height * 0.35);
    ctx.stroke();
  }

  // Roughness value
  ctx.font = `${4 * scale}px Arial`;
  ctx.fillStyle = darkMode ? '#ffffff' : '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Ra ${finish.roughness}`, width * 0.35, height * 0.3);

  // Lay direction if specified
  if (finish.layDirection) {
    const laySymbol = SURFACE_FINISH_LAY[finish.layDirection];
    ctx.fillText(laySymbol, width * 0.35, height * 0.7);
  }

  ctx.restore();
}
