import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MÍMICA — Aprende Lengua de Señas",
  description:
    "El videojuego educativo más divertido para aprender el alfabeto en lengua de señas. Practica con tu cámara en tiempo real.",
  keywords: [
    "MÍMICA",
    "lengua de señas",
    "señas",
    "alfabeto",
    "aprender",
    "educación",
    "accesibilidad",
    "sign language",
  ],
  authors: [{ name: "SenaWord" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤟</text></svg>",
  },
  openGraph: {
    title: "MÍMICA — Aprende Lengua de Señas",
    description: "Aprende el alfabeto en lengua de señas de forma divertida e interactiva.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-game-bg text-game-text overflow-x-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}