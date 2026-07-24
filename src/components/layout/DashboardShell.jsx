"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardShell({
  children,
  userName,
  userEmail,
  school,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function openMobileMenu() {
    setIsMobileMenuOpen(true);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  /*
   * Bloquea el scroll de la página
   * mientras el menú móvil está abierto.
   */
  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = "";

      return undefined;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  /*
   * Permite cerrar el menú móvil
   * presionando la tecla Escape.
   */
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar de escritorio */}
      <Sidebar variant="desktop" />

      {/* Fondo oscuro móvil */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={closeMobileMenu}
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar móvil */}
      <Sidebar
        variant="mobile"
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
      />

      <div className="min-w-0 lg:pl-64">
        <Header
          userName={userName}
          userEmail={userEmail}
          school={school}
          onOpenMenu={openMobileMenu}
        />

        <main className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
