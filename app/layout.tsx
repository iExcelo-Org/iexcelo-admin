import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { geistSans } from "@/src/lib/fonts";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ADMIN_BASE_URL, ADMIN_ROBOTS, ADMIN_SITE_NAME } from "@/src/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(ADMIN_BASE_URL),
  title: {
    default: ADMIN_SITE_NAME,
    template: `iExcelo Admin - %s`,
  },
  description: "iExcelo Administration Panel — manage students, sponsors, affiliates, exams, and platform content.",
  robots: ADMIN_ROBOTS,
  icons: {
    icon: "/seo/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistSans.className} min-h-full bg-[#F9FAFB] antialiased`}
      >
        <TooltipProvider>
          <main>{children}</main>
        </TooltipProvider>
        <Toaster
          toastOptions={{
            classNames: {
              toast:
                "bg-white! border-[#007FFF]/30! shadow-lg! text-xs! md:text-sm! text-black! backdrop-blur-md!",
              description: "text-[#6B7280]!",
              actionButton: "bg-[#007FFF]! text-white!",
              cancelButton: "bg-gray-100! text-gray-600!",
              closeButton: "bg-white! border-[#007FFF]/20! text-[#007FFF]!",
              success: "border-l-4! border-l-green-500!",
              error: "border-l-4! border-l-red-500!",
              warning: "border-l-4! border-l-yellow-500!",
              info: "border-l-4! border-l-[#007FFF]!",
            },
            className: "md:max-w-[450px]! min-w-fit! whitespace-nowrap!",
          }}
          position="bottom-right"
          duration={6000}
        />
      </body>
    </html>
  );
}
