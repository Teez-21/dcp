import type { Metadata } from "next";
import "./globals.css";
import "./branding.css";
import ThemeSync from "@/components/dashboard/ThemeSync";

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
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const raw=localStorage.getItem("datos-a-tener-en-cuenta:v1");const state=raw?JSON.parse(raw).state:null;const id=state&&state.theme;const defaults={"palette-1":["#B3262E","#FAF8F5","#B3262E","#1F2328","#7E1A22"],"palette-2":["#5B3A8C","#EFEAF6","#5B3A8C","#1E1B26","#B9A8D6"],"palette-3":["#EE6C1F","#FFF3E3","#B5441B","#26275E","#F7A13B"],"palette-5":["#0E9CA8","#FAF8F5","#D93A3F","#0F2A33","#0A4F5C"],"palette-6":["#F37021","#FFF6EC","#D0243A","#151A2E","#232A4D"]};if(id)document.documentElement.dataset.theme=id;if(defaults[id]){const r=document.documentElement;const c=defaults[id];[["--brand-primary",c[0]],["--brand-bg",c[1]],["--brand-action",c[2]],["--brand-text",c[3]],["--brand-support",c[4]],["--accent",c[0]],["--accent2",c[4]],["--accent-ink",c[2]],["--fg",c[3]],["--bg",c[1]]].forEach(([k,v])=>r.style.setProperty(k,v))}}catch(e){}`,
          }}
        />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
