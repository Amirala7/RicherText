import type { Metadata } from "next";
import { Geist, IBM_Plex_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

// The second writing font (ADR 0010, 0031): not preloaded, so it's only
// downloaded when a user's writing font uses it.
const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  preload: false,
});

export const metadata: Metadata = {
  title: "RicherText",
  description: "A minimal, fast rich text editor for professionals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${plexSerif.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
