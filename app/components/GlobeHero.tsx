'use client';

// Use the imperative factory API from globe.gl (imported dynamically on the client)
import { useEffect, useRef } from 'react';
import { MeshPhongMaterial } from 'three';

export default function GlobeHero() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Point-in-polygon check for accurate country boundaries
  const pointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    let inside = false;
    const [lat, lng] = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [latI, lngI] = polygon[i];
      const [latJ, lngJ] = polygon[j];

      const intersect =
        (latI > lat) !== (latJ > lat) &&
        lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    (async () => {
      // Dynamically import globe.gl only on the client to avoid SSR/window issues
      const { default: GlobeFactory } = await import('globe.gl');

      // TS typings describe GlobeFactory as a constructor; cast to any so we can
      // use the documented functional factory style without changing behavior.
      const globe = (GlobeFactory as any)(containerRef.current!)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl(null as any)
        .width(800)
        .height(800);

      // Apply material
      const globeMaterial = new MeshPhongMaterial({
        color: '#4F7DFF',
        // Semi-transparent shell; let points show through by not writing depth
        opacity: 0.12,
        emissive: '#4F7DFF',
        emissiveIntensity: 0.04,
        transparent: true,
        depthWrite: false,
      });
      globe.globeMaterial(globeMaterial);

      // Configure controls for auto-rotation and no user-driven movement
      try {
        const controls = globe.controls?.();
        if (controls) {
          const anyControls = controls as any;
          anyControls.autoRotate = true;
          // Slightly slower, smooth spin
          anyControls.autoRotateSpeed = 0.6;

          // Completely lock user interaction: no rotate, pan, or zoom
          if ('enableRotate' in anyControls) {
            anyControls.enableRotate = false;
          }
          if ('enablePan' in anyControls) {
            anyControls.enablePan = false;
          }
          if ('enableZoom' in anyControls) {
            anyControls.enableZoom = false;
          }
        }
      } catch (e) {
        console.warn('Failed to configure globe controls:', e);
      }

      // Load GeoJSON and configure points
      fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;

          const points: any[] = [];
          const continents: Record<string, [number, number][][]> = {};

          data.features.forEach((feature: any) => {
            const geom = feature.geometry;
            if (!geom) return;

            const props = feature.properties || {};
            const continentName: string =
              props.CONTINENT || props.continent || props.REGION_UN || 'Other';

            if (!continents[continentName]) {
              continents[continentName] = [];
            }

            if (geom.type === 'Polygon') {
              const polygon = geom.coordinates[0].map(
                ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
              );
              continents[continentName].push(polygon);
            } else if (geom.type === 'MultiPolygon') {
              geom.coordinates.forEach((poly: any) => {
                if (!poly || !poly[0]) return;
                const polygon = poly[0].map(
                  ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
                );
                continents[continentName].push(polygon);
              });
            }
          });

          Object.values(continents).forEach((polygons) => {
            if (!polygons.length) return;

            let minLat = Infinity,
              maxLat = -Infinity,
              minLng = Infinity,
              maxLng = -Infinity;

            polygons.forEach((polygon) => {
              polygon.forEach(([lat, lng]) => {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
              });
            });

            // Larger step = fewer points = faster load and smoother rotation
            const stepDeg = 1.4;

            for (let lat = minLat; lat <= maxLat; lat += stepDeg) {
              for (let lng = minLng; lng <= maxLng; lng += stepDeg) {
                let inside = false;
                for (const poly of polygons) {
                  if (pointInPolygon([lat, lng], poly)) {
                    inside = true;
                    break;
                  }
                }
                if (inside) {
                  points.push({
                    lat,
                    lng,
                    size: 0.18,
                  });
                }
              }
            }
          });

          globe
            .pointsData(points)
            .pointLat('lat')
            .pointLng('lng')
            .pointAltitude(0)
            .pointRadius((d: any) => d.size || 0.14)
            // Slightly more transparent dots so the globe feels lighter
            .pointColor(() => 'rgba(255,255,255,0.6)')
            .pointResolution(6)
            .pointsMerge(true);
        })
        .catch((err) => {
          console.error('Failed to load GeoJSON:', err);
        });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative w-full flex items-center justify-start pl-0 h-full min-h-[520px]">
      {/* Globe box is nudged to the right within its column */}
      <div
        ref={containerRef}
        className="w-full h-full max-w-[800px] md:max-w-[800px]"
        style={{ aspectRatio: '1 / 1', marginLeft: '160px', marginTop: '-150px' }}
      />
    </div>
  );
}
