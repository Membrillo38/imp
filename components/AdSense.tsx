'use client';

import { useEffect, useState } from 'react';

interface AdSenseProps {
  adSlot?: string;
  adFormat?: string;
  style?: React.CSSProperties;
  className?: string;
  fullWidthResponsive?: boolean;
}

export default function AdSense({
  adSlot,
  adFormat = 'auto',
  style,
  className = '',
  fullWidthResponsive = true,
}: AdSenseProps) {
  const [isClient, setIsClient] = useState(false);
  const hasAdSense = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;

  useEffect(() => {
    setIsClient(true);

    if (hasAdSense && typeof window !== 'undefined') {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('Error loading AdSense:', err);
      }
    }
  }, [hasAdSense]);

  // Si no hay configuración de AdSense, mostrar placeholder gris
  if (!hasAdSense || !isClient) {
    return (
      <div
        className={`bg-gray-300 flex items-center justify-center ${className}`}
        style={{
          minHeight: '100px',
          minWidth: '100%',
          ...style,
        }}
      >
        <span className="text-gray-500 text-sm">Publicidad</span>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle block"
      style={{
        display: 'block',
        minHeight: '100px',
        ...style,
      }}
      data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
    />
  );
}

// Componente para cargar el script de AdSense
export function AdSenseScript() {
  const adSenseId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;

  if (!adSenseId) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (adsbygoogle = window.adsbygoogle || []).push({});
        `,
      }}
    />
  );
}

