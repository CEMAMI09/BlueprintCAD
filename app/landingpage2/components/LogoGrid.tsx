'use client';

import React from 'react';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

type PartnerLogo = {
  name: string;
  src: string;
};

// Only include logos that actually exist in public/logos
const partnerLogos: PartnerLogo[] = [
  { name: 'Google', src: '/logos/Google__G__logo.svg.png' },
  { name: 'Apple', src: '/logos/apple-logo.webp' },
  { name: 'Amazon', src: '/logos/amazon_icon_logo-logo_brandlogos.net_fgndw.png' },
  { name: 'NVIDIA', src: '/logos/nvidia-logo-vert.png' },
  { name: 'Autodesk', src: '/logos/Autodesk_logo.png' },
  { name: 'Meta', src: '/logos/logo-Meta.format-webp.width-1440_ckkRnkDOvtfMg7Qx.webp' },
  { name: 'Adobe', src: '/logos/Adobe_Corporate_wordmark.svg.png' },
];

function PartnerLogoMark({ name, src }: PartnerLogo) {
  // Slightly larger frame for key logos
  const isKeyLogo =
    name === 'Google' || name === 'Meta';

  const isExtraLargeLogo = name === 'Apple' || name === 'Autodesk';
  const isSuperLargeLogo = name === 'Amazon' || name === 'NVIDIA';

  const frameWidth = isSuperLargeLogo ? 260 : isExtraLargeLogo ? 220 : isKeyLogo ? 180 : 140;
  const frameHeight = isSuperLargeLogo ? 64 : isExtraLargeLogo ? 56 : isKeyLogo ? 48 : 40;
  const imgMaxWidth = isSuperLargeLogo ? 220 : isExtraLargeLogo ? 190 : isKeyLogo ? 150 : 120;
  const imgMaxHeight = isSuperLargeLogo ? 56 : isExtraLargeLogo ? 48 : isKeyLogo ? 40 : 32;

  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: `${frameWidth}px`, height: `${frameHeight}px` }}
    >
      <Image
        src={src}
        alt={`${name} logo`}
        width={imgMaxWidth}
        height={imgMaxHeight}
        style={{ objectFit: 'contain', maxWidth: `${imgMaxWidth}px`, maxHeight: `${imgMaxHeight}px` }}
      />
    </div>
  );
}

export default function LogoGrid() {
  const scrollingLogos = [...partnerLogos, ...partnerLogos];

  return (
    <section className="py-16 bg-[#24272e]" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
      <div
        className="w-full border-t border-b border-[#374151] py-16"
        style={{
          borderTop: '1px solid #374151',
          borderBottom: '1px solid #374151',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
      >
        {/* Full-width marquee */}
        <ScrollReveal>
          <div className="logo-marquee-wrapper opacity-80 px-8 sm:px-16">
            <div className="logo-marquee gap-16">
              {scrollingLogos.map((logo, index) => (
                <PartnerLogoMark key={`${logo.name}-${index}`} name={logo.name} src={logo.src} />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
