import type { Metadata } from "next";
import { Grenze_Gotisch, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const body = Schibsted_Grotesk({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const gothic = Grenze_Gotisch({ variable: "--font-gothic", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Brio, pâtisseries de Noël",
  description: "Commandez vos pâtisseries de Noël et retirez-les au point de retrait de votre choix.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${body.variable} ${gothic.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
