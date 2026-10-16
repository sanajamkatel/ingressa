import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant, Fredoka } from "next/font/google";
import { FloatingNav } from "@/components/navigation/FloatingNav";
import { UnsavedImportProvider } from "@/components/navigation/UnsavedImportContext";
import { TimeOfDayBackground } from "@/components/ui/TimeOfDayBackground";
import { SITE } from "@/lib/constants";
import "./globals.css";

const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('ingressa-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="en"
        className={`${cormorant.variable} ${fredoka.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full">
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          <TimeOfDayBackground />
          <UnsavedImportProvider>
            <FloatingNav />
            {children}
          </UnsavedImportProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
