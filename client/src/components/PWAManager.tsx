import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function PWAManager() {
  const [location] = useLocation();

  useEffect(() => {
    const manifestLink = document.getElementById('app-manifest') as HTMLLinkElement;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;

    if (location.startsWith('/customer')) {
      if (manifestLink) manifestLink.href = '/manifest-customer.json';
      document.title = 'Yens Customer';
      if (themeColorMeta) themeColorMeta.content = '#FCD34D';
      if (appleTitleMeta) appleTitleMeta.content = 'Yens Customer';
    } else if (location.startsWith('/barista')) {
      if (manifestLink) manifestLink.href = '/manifest-barista.json';
      document.title = 'Yens Barista';
      if (themeColorMeta) themeColorMeta.content = '#1E40AF';
      if (appleTitleMeta) appleTitleMeta.content = 'Yens Barista';
    } else if (location.startsWith('/admin')) {
      if (manifestLink) manifestLink.href = '/manifest-admin.json';
      document.title = 'Yens Admin';
      if (themeColorMeta) themeColorMeta.content = '#1E40AF';
      if (appleTitleMeta) appleTitleMeta.content = 'Yens Admin';
    } else {
      if (manifestLink) manifestLink.href = '/manifest.json';
      document.title = 'Yens Loyalty System';
      if (themeColorMeta) themeColorMeta.content = '#FCD34D';
      if (appleTitleMeta) appleTitleMeta.content = 'Yens';
    }
  }, [location]);

  return null;
}
