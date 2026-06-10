import type { Metadata } from "next";
import { Providers } from "./providers";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Market Bubble — Live",
    template: "%s | Market Bubble",
  },
  description:
    "The unified live dashboard for Market Bubble. One chat across Twitch, Kick and X. Make money, command attention, leverage AI.",
  openGraph: {
    type: "website",
    siteName: "Market Bubble",
    title: "Market Bubble — Live",
    description: "One chat across Twitch, Kick and X. Live every Thursday, 1PM PST.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Bubble — Live",
    description: "One chat across Twitch, Kick and X. Live every Thursday, 1PM PST.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('chakra-ui-color-mode')||'dark';document.documentElement.style.colorScheme=m;document.documentElement.style.backgroundColor=m==='dark'?'#0b0b0b':'#f5f4eb'}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning style={{ height: "100vh", overflow: "hidden" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
