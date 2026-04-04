'use client'

import '../styles/globals.css'
import type { ReactNode } from 'react'
import { AuthProvider } from '@pi-server/ui'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var timers = new WeakMap();
            document.addEventListener('scroll', function(e) {
              var el = e.target;
              if (!(el instanceof Element)) return;
              el.setAttribute('data-scrolling', '');
              var t = timers.get(el);
              if (t) clearTimeout(t);
              timers.set(el, setTimeout(function() {
                el.removeAttribute('data-scrolling');
              }, 1500));
            }, true);
          })();
        ` }} />
      </body>
    </html>
  )
}
