import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "PLANEJAR+ | Sua vida financeira começa com um plano", description: "Organize, planeje e conquiste." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
