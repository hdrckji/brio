import type { Metadata } from "next";
import { Gilda_Display, Jost } from "next/font/google";
import "./globals.css";

const body = Jost({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const roman = Gilda_Display({ variable: "--font-roman", weight: "400", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Coukiz, biscuits de Noël",
  description: "Commandez vos biscuits et douceurs de Noël et retirez-les au point de retrait de votre choix.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${body.variable} ${roman.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
