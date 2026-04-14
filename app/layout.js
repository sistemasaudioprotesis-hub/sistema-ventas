export const metadata = {
  title: 'Sistema Ventas',
  description: 'App de gestión',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
