import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

const serviceCategories = [
  {
    title: "Cars",
    items: [
      "Periodic Maintenance",
      "Car Wash",
      "Denting & Painting",
      "Car Detailing",
      "Air Conditioning",
      "Car Body Shop"
    ]
  }
];

const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about-us' },
    { name: 'Services', path: '/services' },
    { name: 'Reviews', path: '/reviews' },
    { name: 'Blog', path: '/blog' },
    { name: 'Careers', path: '/careers' },
    { name: 'FAQs', path: '/faqs' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-card/80 backdrop-blur-xl border-b border-border shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/speshway-logo.png"
            alt="Speshway Solutions"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <span className={`font-semibold text-lg ${isScrolled ? 'text-foreground' : 'text-white'}`}>Speshway Solutions</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            if (link.name === 'Services') {
              return (
                <DropdownMenu key={link.name}>
                  <DropdownMenuTrigger className={`flex items-center gap-1 text-sm font-medium transition-colors outline-none ${
                    location.pathname.startsWith('/services')
                      ? 'text-primary'
                      : (isScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white')
                  }`}>
                    {link.name}
                    <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {serviceCategories[0].items.map((item) => (
                      <DropdownMenuItem key={item} asChild>
                        <Link 
                          to={`/services?category=${encodeURIComponent(serviceCategories[0].title)}&service=${encodeURIComponent(item)}`}
                          className="cursor-pointer w-full"
                        >
                          {item}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary'
                    : (isScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white')
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link 
            to="/login" 
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              isScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white'
            }`}
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`md:hidden p-2 transition-colors ${
            isScrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-white/80'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'text-primary'
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Link 
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-center text-foreground hover:text-primary transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium text-center hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
