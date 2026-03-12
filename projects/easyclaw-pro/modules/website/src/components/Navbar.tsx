"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Terminal, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "功能" },
  { href: "#how-it-works", label: "流程" },
  { href: "#pricing", label: "定價" },
  { href: "#faq", label: "問答" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-lg bg-[hsl(243_84%_69%)] flex items-center justify-center transition-all">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              EasyClaw<span className="text-[hsl(243_84%_69%)]">.Pro</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#pricing"
              className="px-4 py-2 rounded-lg bg-[hsl(243_84%_69%)] hover:bg-[hsl(243_100%_45%)] text-white text-sm font-medium transition-all"
            >
              開始部署
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="#pricing"
                className="px-4 py-2 rounded-lg bg-[hsl(243_84%_69%)] hover:bg-[hsl(243_100%_45%)] text-white text-sm font-medium transition-all text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                開始部署
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
