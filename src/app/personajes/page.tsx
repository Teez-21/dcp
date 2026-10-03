import type { Metadata } from "next";
import CharacterHub from "@/components/characters/CharacterHub";

export const metadata: Metadata = {
  title: "Personajes importantes · Datos a tener en cuenta",
  description: "Directorio público de personajes importantes para el análisis político y territorial de Bogotá.",
};

export default function PersonajesPage() {
  return <CharacterHub />;
}
