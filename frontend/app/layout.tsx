import type { Metadata } from "next";
import { Inter, Poppins, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { WhatsNewPopup } from "@/components/WhatsNewPopup";
import { ToastProvider } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-main",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Assignment Reminder Bot",
  description: "Get WhatsApp reminders for your Moodle assignments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, poppins.variable, spaceGrotesk.variable)}
    >
      <body className="font-sans h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <div className="flex-1 flex flex-col min-h-full">{children}</div>
            <WhatsNewPopup />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
