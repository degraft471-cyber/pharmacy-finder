export default function manifest() {
  return {
    name: 'Pharmacy Finder',
    short_name: 'PharmacyFinder',
    description: 'Find nearby pharmacies, medicines and prices in Ghana',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}