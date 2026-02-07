import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "LeanOn.Us Dashboard",
  description: "Voice AI Agent Dashboard — Manage your AI receptionist, calls, and leads.",
  metadataBase: new URL("https://app.leanon.us"),
  openGraph: {
    title: "LeanOn.Us — Voice AI Dashboard",
    description: "Your AI receptionist command center. Track calls, manage leads, and monitor performance in real time.",
    url: "https://app.leanon.us",
    siteName: "LeanOn.Us",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeanOn.Us Voice AI Dashboard",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeanOn.Us — Voice AI Dashboard",
    description: "Your AI receptionist command center. Track calls, manage leads, and monitor performance in real time.",
    images: ["/og-image.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
