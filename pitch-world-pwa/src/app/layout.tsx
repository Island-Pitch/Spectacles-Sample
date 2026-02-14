import type { Metadata, Viewport } from "next";
import { AriaLiveProvider } from "@/a11y/aria-live-region";
import "./globals.css";

/**
 * SEO-01: Page title ≤60 chars
 * SEO-02: Meta description ≤155 chars
 * SEO-03: Canonical URL
 * SEO-06: Open Graph (og:title, og:description, og:image, og:url, og:type, og:site_name)
 * SEO-07: Twitter card (summary_large_image)
 * SEO-08: JSON-LD with @graph
 * SEO-14: Preconnect hints
 * HTML-01: lang attribute
 * HTML-02: Skip-to-content link
 * HTML-03: Semantic landmarks (header, nav, main, footer)
 * PWA-01: Manifest link
 */

const SITE_URL = "https://pitchworld.islandpitch.world";
const SITE_NAME = "Pitch World";
const DESCRIPTION =
  "Describe it. See it. Accessible AR experience by Island Pitch. Do Cool Things the Right Way.";

export const metadata: Metadata = {
  title: {
    default: "Pitch World — Island Pitch",
    template: "%s — Pitch World",
  },
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  manifest: "/assets/images/favicon/site.webmanifest",
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Pitch World — Island Pitch",
    description: "Describe it. See it. Accessible AR powered by voice.",
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    images: [
      {
        url: "/assets/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pitch World — Accessible AR by Island Pitch",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pitch World — Island Pitch",
    description: "Describe it. See it. Accessible AR powered by voice.",
    images: ["/assets/images/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#030400",
};

/** SEO-08: JSON-LD with @graph (WebApplication + Organization) */
function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        description: DESCRIPTION,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        creator: {
          "@type": "Organization",
          name: "Island Pitch",
          url: "https://islandpitch.world",
        },
      },
      {
        "@type": "Organization",
        name: "Island Pitch",
        url: "https://islandpitch.world",
        description:
          "Creative tech consultancy specializing in AI, AR, VR, and accessible experiences.",
        slogan: "Do Cool Things the Right Way!",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** SW-09: Register custom service worker from client side */
function SWRegister() {
  const code = `
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(reg) {
          reg.addEventListener('updatefound', function() {
            var newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', function() {
                if (newWorker.state === 'activated') {
                  navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type: 'SW_UPDATED' });
                }
              });
            }
          });
        });
      });
    }
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        {/* SEO-14: Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* PWA: Apple touch icon */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/assets/images/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/assets/images/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/assets/images/favicon/favicon-16x16.png"
        />
        <JsonLd />
        <SWRegister />
      </head>
      <body>
        {/* HTML-02: Skip-to-content link (A11Y-02) */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        {/* HTML-03: Semantic landmark — header */}
        <header role="banner" className="sr-only">
          <span>Pitch World by Island Pitch</span>
        </header>

        <AriaLiveProvider>
          {/* HTML-03: Semantic landmark — main */}
          <main id="main-content" role="main" className="h-full">
            {children}
          </main>
        </AriaLiveProvider>

        {/* HTML-03: Semantic landmark — footer */}
        <footer role="contentinfo" className="sr-only">
          <p>&copy; Island Pitch. Do Cool Things the Right Way!</p>
        </footer>
      </body>
    </html>
  );
}
