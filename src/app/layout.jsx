import "./globals.css";

export const metadata = {
  title: {
    default: "Horarium",
    template: "%s | Horarium",
  },
  description: "Sistema para generar y administrar horarios escolares.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}