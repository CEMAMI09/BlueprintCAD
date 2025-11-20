# Blueprint CAD Editor - Full Onshape Clone Roadmap

## Executive Summary

This document outlines a comprehensive 18-month development plan to transform Blueprint's CAD Editor into a fully-featured, web-based parametric CAD system comparable to Onshape. The plan balances feature completeness with Blueprint's unique differentiators.

**Estimated Timeline**: 18 months  
**Estimated Budget**: $825k - $1M  
**Team Size**: 3 senior developers + 1 designer  

---

## Current State (as of today)

✅ **Completed Infrastructure**:
- Three.js 3D viewport with OrbitControls
- Basic sketch tools (rectangle, circle, line) with drag-to-draw
- Selection highlighting and visual feedback
- Modal-based UI (no browser alerts)
- Transform controls (move, rotate, scale)
- Tier-based feature access system
- Geometry kernel foundation (`lib/cad/geometry-kernel.ts`)
- Constraint solver framework (`lib/cad/sketch-solver.ts`)
- Boolean operations support (three-csg-ts)
- Undo/redo system with state capture
- STL/OBJ import capability

🚧 **Partially Complete**:
- Extrude operation (UI ready, needs sketch integration)
- Feature history tree (backend ready, UI needed)
- Export formats (modal created, export logic needed)

❌ **Missing Critical Features**:
- BREP (Boundary Representation) topology
- Advanced sketch tools (arc, spline, polygon)
- Revolve, sweep, loft operations
- Fillet, chamfer, shell operations
- Assembly system with mates
- Drawing views and dimensioning
- Real-time collaboration
- Version control system
- STEP/IGES import/export
- Performance optimization for large models

---

## Phase 1: Core Geometry Engine (Months 1-4)

### Goal
Build a robust BREP-based geometry kernel to replace the current mesh-based system.

### Week 1-2: BREP Data Structure
**Deliverables**:
- `lib/cad/brep/` directory structure
- Classes: `Vertex`, `Edge`, `Face`, `Shell`, `Solid`
- Topological relationships (Edge → Vertices, Face → Edges, etc.)
- Half-edge data structure for efficient traversal

**Technical Details**:
```typescript
// lib/cad/brep/topology.ts
class Vertex {
  id: string;
  position: THREE.Vector3;
  edges: Edge[] = [];
}

class Edge {
  id: string;
  startVertex: Vertex;
  endVertex: Vertex;
  curve: Curve; // NURBS curve
  faces: Face[] = []; // 1 or 2 faces
}

class Face {
  id: string;
  surface: Surface; // NURBS surface
  outerLoop: Loop;
  innerLoops: Loop[] = []; // holes
  normal: THREE.Vector3;
}

class Loop {
  edges: HalfEdge[];
  isClosed: boolean;
}

class Solid {
  shells: Shell[];
  volume: number;
  centerOfMass: THREE.Vector3;
}
```

### Week 3-4: Topology Operations
**Deliverables**:
- `splitEdge()`, `mergeEdges()`, `splitFace()`
- Euler operators (make-edge-vertex, kill-edge-vertex, etc.)
- Topological validation (manifold checks, orientation)
- Unit tests for all topology operations

### Week 5-8: Boolean Operations with BREP
**Deliverables**:
- Replace three-csg-ts with custom BREP booleans
- Algorithms: union, subtract, intersect
- Edge-face intersection detection
- Face trimming and splitting
- Improved performance (10x faster than CSG meshes)

**Alternative**: Integrate Open CASCADE's boolean engine via WebAssembly

### Week 9-12: Fillet & Chamfer
**Deliverables**:
- Edge selection UI (click edge to highlight)
- Fillet algorithm with rolling ball method
- Chamfer with distance/angle parameters
- Variable radius fillets
- Preview before applying

### Week 13-16: Parametric History Tree
**Deliverables**:
- Feature dependency graph (DAG)
- Feature edit propagation (re-compute downstream features)
- Suppress/unsuppress features
- Reorder features with dependency validation
- UI: Feature tree sidebar with icons

**Key Challenge**: Handling circular dependencies and failed regeneration

---

## Phase 2: Advanced Sketching (Months 5-6)

### Week 17-18: Additional Sketch Tools
**Deliverables**:
- **Arc tool**: 3-point arc, center-start-end arc, tangent arc
- **Polygon tool**: Click corners, close with first point
- **Spline tool**: Click control points, B-spline interpolation
- **Ellipse tool**: Center + 2 radii
- **Offset tool**: Offset curves inward/outward
- **Trim/extend tool**: Split curves at intersections

### Week 19-20: Constraint UI
**Deliverables**:
- Right-click on geometry → Add constraint menu
- Visual indicators for constraints (icons on entities)
- Constraint manager sidebar (list all constraints)
- Auto-constraints (detect parallel/perpendicular on draw)
- Constraint conflict detection and resolution

**Example UI**:
```
Select 2 lines → Toolbar shows:
[Parallel] [Perpendicular] [Equal Length] [Angle]

Select 1 line → Toolbar shows:
[Horizontal] [Vertical] [Fix Length]
```

### Week 21-22: Dimension Annotations
**Deliverables**:
- Linear dimensions (horizontal, vertical, aligned)
- Angular dimensions
- Radial/diameter dimensions
- Editable dimension values (double-click to change)
- Dimension-driven constraints (change dimension → sketch updates)

### Week 23-24: Sketch Solver Optimization
**Deliverables**:
- Replace iterative solver with Newton-Raphson method
- Jacobian matrix computation for constraints
- 10x faster convergence
- Handle over-constrained and under-constrained sketches
- Drag entities to update (dynamic solver)

**Performance Target**: Solve 1000-entity sketch in <100ms

---

## Phase 3: 3D Operations (Months 7-8)

### Week 25-26: Sweep & Loft
**Deliverables**:
- **Sweep**: Extrude profile along path curve
- **Loft**: Blend between 2+ profiles
- Guide curves for loft control
- Twist and scale options
- Preview before applying

**UI Flow**:
1. Select sketch profile
2. Click "Sweep" → Select path curve
3. Adjust parameters (twist angle, scale factor)
4. Confirm

### Week 27-28: Shell Operation
**Deliverables**:
- Hollow out solid bodies
- Select faces to remove
- Wall thickness parameter
- Multi-thickness (different walls have different thicknesses)
- Preview with transparency

**Use Case**: Create bottle from solid cylinder

### Week 29-30: Draft Analysis
**Deliverables**:
- Draft tool: Taper faces for molding
- Neutral plane or parting line
- Draft angle parameter
- Color-coded analysis view (red = negative draft, green = positive)

### Week 31-32: Face Operations
**Deliverables**:
- **Offset faces**: Move faces inward/outward
- **Delete faces**: Remove and heal topology
- **Replace face**: Replace with new surface
- **Mirror feature**: Mirror geometry across plane

---

## Phase 4: Patterns & Arrays (Month 9)

### Week 33-34: Linear & Circular Patterns
**Deliverables**:
- Linear pattern: Repeat feature along direction
- Circular pattern: Repeat around axis
- Parameters: count, spacing/angle
- Pattern of patterns (nested arrays)
- Suppress individual instances

**Example**: Create bolt circle (6 holes around center)

### Week 35-36: Advanced Patterns
**Deliverables**:
- **Curve-driven pattern**: Distribute along spline
- **Feature pattern**: Pattern entire feature (not just geometry)
- **Fill pattern**: Fill area with instances
- **Variable spacing**: Non-uniform distribution

---

## Phase 5: Assembly System (Months 10-11)

### Week 37-38: Assembly Foundation
**Deliverables**:
- Assembly document type (distinct from Part)
- Insert parts as instances
- Assembly tree UI (expand/collapse hierarchy)
- Instance properties (position, rotation, scale)
- Sub-assemblies (nested assemblies)

**File Structure**:
```
Assembly.asm
  ├─ Part1.prt (instance 1)
  ├─ Part1.prt (instance 2)
  ├─ Part2.prt
  └─ SubAssembly.asm
      ├─ Part3.prt
      └─ Part4.prt
```

### Week 39-40: Mate System
**Deliverables**:
- **Mate types**:
  - Fixed: No movement
  - Revolute: Rotation around axis
  - Slider: Translation along axis
  - Planar: Slide on plane
  - Cylindrical: Slide + rotate
  - Ball: Rotate in all directions
- Mate selection UI (click faces/edges/points)
- Mate offset parameters
- Mate flip (reverse direction)

### Week 41-42: Mate Solving
**Deliverables**:
- Constraint solver for assembly mates
- Detect over-constrained assemblies
- Drag parts to desired position (solver finds solution)
- Interference detection (collision highlighting)
- Degrees of freedom display

### Week 43-44: Exploded Views & Animations
**Deliverables**:
- Exploded view mode (parts separated)
- Auto-explode algorithm (move along assembly direction)
- Manual explode (drag individual parts)
- Animation timeline (record assembly sequence)
- Export animation as MP4

---

## Phase 6: Drawings & Documentation (Month 12)

### Week 45-46: 2D Projection
**Deliverables**:
- Drawing sheet format (A4, A3, Letter, etc.)
- Orthographic projection (front, top, right views)
- Isometric view
- Section view (cut through part)
- Detail view (zoom into area)

### Week 47-48: Dimensioning
**Deliverables**:
- Auto-dimension tool (detect critical dimensions)
- Manual dimension placement
- GD&T symbols (geometric tolerancing)
- Surface finish symbols
- Weld symbols

### Week 49-50: Advanced Drawing Views
**Deliverables**:
- Broken-out section (partial cut)
- Aligned section (section along non-planar path)
- Auxiliary view (projection onto angled plane)
- Broken view (show long part with break lines)

### Week 51-52: BOM & Export
**Deliverables**:
- Bill of Materials (BOM) table
- Part number, description, quantity, material
- Export to PDF (vector graphics)
- Export to DXF/DWG (for laser cutting)
- Print to scale

---

## Phase 7: Real-Time Collaboration (Months 13-14)

### Week 53-54: WebSocket Server
**Deliverables**:
- WebSocket server (`lib/collab/server.ts`)
- User presence tracking (online users list)
- Operational Transform (OT) algorithm for conflict-free edits
- Event types: feature-added, feature-modified, feature-deleted

**Tech Stack**: Node.js + Socket.io or native WebSockets

### Week 55-56: Multi-User UI
**Deliverables**:
- User avatars/cursors in viewport
- Color-coded selection (each user has unique color)
- Typing indicators (who's editing what)
- User list sidebar with kick/permissions

### Week 57-58: Conflict Resolution
**Deliverables**:
- Detect conflicting edits (2 users edit same feature)
- Merge strategies: last-write-wins, manual resolution
- Conflict notification UI
- Revert to previous version

### Week 59-60: Activity Log
**Deliverables**:
- Timeline of all edits (who changed what, when)
- Filter by user, feature type, date
- Replay mode (watch edits in sequence)
- Export activity report

---

## Phase 8: Version Control (Month 15)

### Week 61-62: Branching System
**Deliverables**:
- Git-like branches (main, feature branches)
- Create branch from current version
- Switch between branches
- Branch visualization (tree diagram)

### Week 63-64: Diff Visualization
**Deliverables**:
- Visual diff between versions (green = added, red = removed)
- 3D geometry diff (overlay models with transparency)
- Feature tree diff (highlight changed features)
- Property diff (changed parameters)

### Week 65-66: Merge System
**Deliverables**:
- Merge branch into main
- Auto-merge non-conflicting changes
- Conflict resolution UI (choose version A or B)
- Test merge (preview before committing)

### Week 67-68: Version Management
**Deliverables**:
- Version history timeline
- Rollback to previous version
- Tag versions (v1.0, v2.0 release tags)
- Restore points (automatic snapshots every hour)

---

## Phase 9: Advanced Features (Month 16)

### Week 69-70: Multi-Body Parts
**Deliverables**:
- Multiple solid bodies in one part
- Body operations (merge, subtract, intersect bodies)
- Body manager sidebar (show/hide bodies)
- Convert body to part

**Use Case**: Design enclosure with separate top and bottom bodies

### Week 71-72: Configuration Tables
**Deliverables**:
- Parameter table (spreadsheet of dimensions)
- Multiple configurations (small, medium, large variants)
- Switch between configurations
- Derived configurations (inherit from parent)

**Example**: Bolt family (M4, M5, M6, M8, M10)

### Week 73-74: Interference Detection
**Deliverables**:
- Analyze assembly for overlapping parts
- Collision volume visualization (red highlights)
- Clearance analysis (minimum distance between parts)
- Export interference report

### Week 75-76: Mass Properties
**Deliverables**:
- Calculate volume, surface area
- Mass (with material density)
- Center of mass (show marker in viewport)
- Moments of inertia (I_xx, I_yy, I_zz)
- Export to CSV

---

## Phase 10: File Formats & Integration (Month 17)

### Week 77-78: Native Exporters
**Deliverables**:
- **STL export**: Binary and ASCII, adjustable resolution
- **OBJ export**: With MTL material file
- **glTF export**: For web 3D viewers
- **FBX export**: For animation software
- Export settings modal (quality, units, scale)

### Week 79-80: STEP/IGES Import
**Deliverables**:
- STEP AP203/AP214 parser (B-rep geometry)
- IGES 5.3 parser
- Convert to Blueprint BREP format
- Heal imported geometry (fix gaps, duplicate vertices)

**Tech Option**: Use Open CASCADE via WebAssembly

### Week 81-82: Parasolid Integration
**Deliverables**:
- Parasolid kernel license ($50k-$100k/year)
- Parasolid.wasm (compile to WebAssembly)
- Use Parasolid for complex operations (fillets, booleans)
- 10x performance improvement

**Alternative**: Stick with open-source kernel to save costs

### Week 83-84: API & Webhooks
**Deliverables**:
- REST API for CAD operations
- Endpoints: `/api/parts`, `/api/assemblies`, `/api/export`
- Webhook triggers (on part update, on export complete)
- API key management
- Rate limiting

**Use Case**: Automate manufacturing quotes via webhook

---

## Phase 11: Performance & Polish (Month 18)

### Week 85-86: WebGL Optimization
**Deliverables**:
- Instanced rendering (for patterns)
- Level of Detail (LOD) system (simplify distant geometry)
- Frustum culling (don't render off-screen objects)
- Batched draw calls (combine similar materials)

**Target**: 60 FPS with 10,000+ objects

### Week 87-88: Offline Mode
**Deliverables**:
- IndexedDB for local storage
- Service worker for offline access
- Sync when back online
- Conflict resolution (local vs. server changes)

### Week 89-90: Keyboard Shortcuts
**Deliverables**:
- Comprehensive shortcut system
- Customizable hotkeys
- Shortcut cheat sheet (press `?`)
- Vim-style command palette (press `:`)

**Essential Shortcuts**:
- `E` = Extrude
- `R` = Revolve
- `S` = Sketch
- `Ctrl+Z` = Undo
- `Ctrl+Y` = Redo
- `Delete` = Delete selected
- `Ctrl+D` = Duplicate
- `Ctrl+S` = Save

### Week 91-92: Final Polish
**Deliverables**:
- UI/UX review (designer feedback)
- Animation polish (smooth transitions)
- Loading states (spinners, progress bars)
- Error messages (helpful, not cryptic)
- User testing (10+ beta users)
- Bug bash (fix 100+ minor issues)

---

## Budget Breakdown

| Category | Cost | Notes |
|----------|------|-------|
| **Development** | $675k | 3 developers × 18 months × $150k/year |
| **Design** | $75k | 1 designer × 6 months × $150k/year |
| **Infrastructure** | $50k | AWS (EC2, S3, RDS, CloudFront) |
| **Licenses** | $100k | Parasolid license (optional) |
| **Testing** | $25k | User testing, QA tools |
| **Contingency** | $75k | 10% buffer for unknowns |
| **TOTAL** | **$1,000,000** | |

**Cost-Saving Alternatives**:
- Use open-source kernel instead of Parasolid: **-$100k**
- Outsource to Eastern Europe: **-$300k**
- Extend timeline to 24 months (part-time team): **-$200k**

---

## Blueprint Differentiators

Instead of being a pure Onshape clone, Blueprint should focus on unique features:

### 1. AI-Assisted Design
- **Auto-constraints**: AI detects intent (parallel, perpendicular) and applies constraints
- **Design suggestions**: "This part might be cheaper if you add draft angles"
- **Optimization**: AI optimizes for 3D printing (infill, supports)

### 2. Marketplace Integration
- **Buy parts in editor**: Drag standard components from marketplace (screws, bearings)
- **Sell your parts**: Publish parts as purchasable components
- **Instant quotes**: Right-click part → "Get manufacturing quote"

### 3. Simpler Hobbyist UX
- **Onboarding wizard**: Step-by-step tutorials for beginners
- **Templates**: Pre-made project templates (phone case, enclosure, bracket)
- **Fewer menus**: Streamlined UI (80% of users only use 20% of features)

### 4. Open-Source Kernel
- **Community contributions**: Allow users to submit geometry algorithms
- **Plugin system**: Users can write extensions (custom tools, exporters)
- **Transparent development**: Public roadmap, open bug tracker

### 5. Web3 Features (Optional)
- **NFT parts**: Mint parts as NFTs (provenance tracking)
- **Blockchain version control**: Immutable history on-chain
- **Decentralized storage**: IPFS for CAD files

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Parasolid license too expensive** | High | High | Use open-source kernel (Open CASCADE) |
| **BREP implementation too complex** | Medium | High | Hire CAD kernel expert as consultant |
| **Real-time collab has race conditions** | High | Medium | Use proven OT library (ShareDB) |
| **Performance issues with large assemblies** | High | High | Implement aggressive LOD and culling |
| **User adoption low** | Medium | High | Focus on marketing, free tier |
| **Team burnout** | Medium | Medium | Realistic timeline, avoid crunch |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Monthly Active Users** | 10,000+ | Analytics |
| **Paid Conversion Rate** | 5% | Stripe dashboard |
| **Average Session Duration** | 30+ minutes | Analytics |
| **Feature Completeness** | 80% of Onshape | Feature checklist |
| **Performance** | 60 FPS with 5000 objects | Profiler |
| **User Satisfaction** | 4.5/5 stars | Surveys |

---

## Timeline Summary

```
Month 1-4:   BREP Geometry Kernel
Month 5-6:   Advanced Sketching
Month 7-8:   3D Operations (Sweep, Loft, Shell)
Month 9:     Patterns & Arrays
Month 10-11: Assembly System
Month 12:    Drawings & Documentation
Month 13-14: Real-Time Collaboration
Month 15:    Version Control
Month 16:    Advanced Features
Month 17:    File Formats & API
Month 18:    Performance & Polish
```

---

## Next Steps (Immediate)

1. **Complete current features** (Weeks 1-2):
   - Finish extrude integration with sketch selection
   - Test undo/redo thoroughly
   - Implement remaining sketch shapes (arc, polygon, spline)

2. **Hire team** (Weeks 2-4):
   - Post job listings for 2 more senior developers
   - Find CAD kernel consultant (contract)

3. **Secure funding** (Weeks 4-8):
   - Pitch to investors with this roadmap
   - Target: $1M seed round

4. **Set up infrastructure** (Weeks 8-12):
   - AWS production environment
   - CI/CD pipeline
   - Monitoring and logging

5. **Start Phase 1** (Month 4):
   - Begin BREP implementation
   - Parallel work on UI polish and current features

---

## Conclusion

Building a full Onshape clone is a **massive undertaking** that will take 18 months and $1M with a skilled team. However, Blueprint has a strong foundation and can differentiate by focusing on:

- **Hobbyist-friendly UX** (simpler than Onshape)
- **Marketplace integration** (buy/sell parts)
- **AI-assisted design** (automatic constraints, optimization)
- **Open-source kernel** (community contributions)

The most critical decision is **whether to build a custom BREP kernel or integrate Parasolid/Open CASCADE**. Custom gives full control but takes longer. Parasolid is expensive but battle-tested.

**Recommendation**: Start with Open CASCADE (open-source, WebAssembly-ready) to validate the product, then consider building custom kernel in Phase 2 if needed.

---

## Appendix: Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | React + Next.js | Current stack, fast development |
| **3D Rendering** | Three.js | Best web 3D library |
| **Geometry Kernel** | Open CASCADE (WASM) | Mature, open-source, STEP support |
| **Backend** | Node.js + PostgreSQL | Current stack |
| **Collaboration** | Socket.io + ShareDB | Proven OT implementation |
| **Storage** | AWS S3 | Scalable object storage |
| **Hosting** | AWS ECS + CloudFront | Auto-scaling, CDN |
| **Version Control** | Git-inspired (custom) | CAD-specific versioning |
| **File Format** | Custom JSON + binary BREP | Fast, compact, version-friendly |

---

**Document Version**: 1.0  
**Last Updated**: 2025  
**Author**: Blueprint Development Team
