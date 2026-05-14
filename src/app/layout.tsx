import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import Toaster from "@/components/ui/Toaster";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Capital Core Dance Studio",
  description: "Studio management platform for Capital Core Dance Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-palette="aurora"
      data-theme="light"
      className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cc-theme');var p=localStorage.getItem('cc-palette');if(t)document.documentElement.dataset.theme=t;if(p)document.documentElement.dataset.palette=p;}catch(e){}})();`,
          }}
        />
        <div className="bg-stage" aria-hidden="true" />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
