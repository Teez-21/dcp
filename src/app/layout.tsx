import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Datos a tener en cuenta",
  description: "Consultoría de campaña · Concejo de Bogotá",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="tokyo">
      <body className="font-sans">{children}</body>
    </html>
  );
}
