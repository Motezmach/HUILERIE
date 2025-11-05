import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Olive Oil Factory Management",
  description: "Professional olive oil factory management system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable mousewheel on number inputs globally
              document.addEventListener('wheel', function(e) {
                if (document.activeElement.type === 'number') {
                  document.activeElement.blur();
                }
              }, { passive: false });
            `,
          }}
        />
      </body>
    </html>
  )
}
