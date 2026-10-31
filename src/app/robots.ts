import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://santiyego.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/firma-paneli/',
          '/alici-paneli/',
          '/odeme/',
          '/mesajlar/',
          '/favorilerim/',
          '/api/',
          '/*?*min_price=*',
          '/*?*max_price=*',
          '/*?*lat=*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
