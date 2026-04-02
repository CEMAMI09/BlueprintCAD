/** Curated industries for seller storefronts (display + filtering in UI). */
export const STOREFRONT_INDUSTRIES: { value: string; label: string }[] = [
  { value: '', label: 'General — all categories' },
  { value: 'miniatures', label: 'Miniatures & tabletop' },
  { value: 'product-design', label: 'Product design & prototyping' },
  { value: 'architecture', label: 'Architecture & construction' },
  { value: 'jewelry', label: 'Jewelry & fashion' },
  { value: 'art', label: 'Art & sculpture' },
  { value: 'mechanical', label: 'Mechanical & engineering' },
  { value: 'hobby', label: 'Hobby & maker' },
  { value: 'education', label: 'Education' },
  { value: 'cosplay', label: 'Cosplay & props' },
  { value: 'home', label: 'Home & decor' },
  { value: 'automotive', label: 'Automotive & RC' },
  { value: 'robotics', label: 'Robotics & drones' },
];

export function industryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const row = STOREFRONT_INDUSTRIES.find((i) => i.value === value);
  return row?.label ?? value;
}
