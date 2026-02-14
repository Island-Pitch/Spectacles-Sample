import type { Metadata, Viewport } from "next";
import { AriaLiveProvider } from "@/a11y/aria-live-region";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pitch World — Island Pitch",
  description:
    "Describe it. See it. Accessible AR experience by Island Pitch. Do Cool Things the Right Way.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pitch World",
  },
  openGraph: {
    title: "Pitch World — Island Pitch",
    description: "Describe it. See it. Accessible AR powered by voice.",
    type: "website",
    url: "https://islandpitch.world",
    siteName: "Pitch World",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#030400",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ip focus:bg-ip-orange focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AriaLiveProvider>
          <main id="main-content" className="h-full">
            {children}
          </main>
        </AriaLiveProvider>
      </body>
    </html>
  );
}
