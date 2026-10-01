import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Datos a tener en cuenta · Inteligencia política",
  description: "Centro de inteligencia electoral para analizar territorio, votaciones, candidatos y temas ciudadanos en Bogotá.",
  keywords: ["consultoría política", "inteligencia electoral", "Bogotá", "votaciones", "análisis territorial"],
  openGraph: {
    type: "website",
    title: "Datos a tener en cuenta · Inteligencia política",
    description: "Centro de inteligencia electoral para analizar territorio, votaciones, candidatos y temas ciudadanos en Bogotá.",
    siteName: "Datos a tener en cuenta",
  },
  twitter: {
    card: "summary_large_image",
    title: "Datos a tener en cuenta · Inteligencia política",
    description: "Centro de inteligencia electoral para analizar territorio, votaciones, candidatos y temas ciudadanos en Bogotá.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="tokyo">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
