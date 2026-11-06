import { buildThemeCss } from '@/shared/theme/colors';
import './globals.css';

export const metadata = {
  title: 'Restaurant Hub',
  description: 'Order delicious food from Restaurant Hub.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* CSS link instead of next/font — avoids Turbopack "@vercel/turbopack-next/internal/font" bug */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />
        {children}
      </body>
    </html>
  );
}
