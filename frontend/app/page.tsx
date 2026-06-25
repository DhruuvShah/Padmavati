"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Box, ShieldCheck, Zap, Menu, X } from "lucide-react";

function FadeIn({ children, delay, duration = 1000 }: { children: React.ReactNode, delay: number, duration?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-opacity transition-transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

function AnimatedHeading({ text, startDelay }: { text: string, startDelay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  const lines = text.split('\n');
  const charDelay = 30;
  let totalCharIndex = 0;

  return (
    <h1
      className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold tracking-tight text-white mb-6 drop-shadow-lg"
      style={{ letterSpacing: '-0.02em' }}
    >
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className="overflow-visible block">
          {line.split('').map((char, charIndex) => {
            const currentDelay = totalCharIndex * charDelay;
            totalCharIndex++;
            return (
              <span
                key={charIndex}
                className="inline-block transition duration-200 ease-out text-white drop-shadow-lg"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(-18px)',
                  transitionDelay: `${currentDelay}ms`
                }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            );
          })}
        </div>
      ))}
    </h1>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-primary/20 text-foreground overflow-hidden">
      {/* Background Mesh Gradient */}
      <div className="fixed inset-0 z-0 bg-warm-white overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cream/50 blur-[120px] mix-blend-multiply"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brass-light/20 blur-[150px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-cream/40 blur-[120px] mix-blend-multiply"></div>
      </div>
      {/* Top Navbar */}
      <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 py-6 flex items-center justify-between border-b border-foreground/10 liquid-glass sticky top-0 rounded-none border-t-0 border-l-0 border-r-0">
        <Link href="/" className="outline-none block">
          <span className="block font-display text-2xl tracking-widest font-semibold text-brass-dark" role="heading" aria-level={2}>THE PADMAVATI CORPORATION</span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm tracking-wide font-medium">
          <button onClick={(e) => scrollToSection(e, 'home')} className="text-foreground border-b border-foreground pb-1 uppercase text-[11px] tracking-widest">Home</button>
          <button onClick={(e) => scrollToSection(e, 'collection')} className="text-foreground/70 hover:text-foreground hover:border-b hover:border-foreground/30 pb-1 transition uppercase text-[11px] tracking-widest">Collection</button>
          <button onClick={(e) => scrollToSection(e, 'about')} className="text-foreground/70 hover:text-foreground hover:border-b hover:border-foreground/30 pb-1 transition uppercase text-[11px] tracking-widest">About Us</button>
          <button onClick={(e) => scrollToSection(e, 'contact')} className="text-foreground/70 hover:text-foreground hover:border-b hover:border-foreground/30 pb-1 transition uppercase text-[11px] tracking-widest">Contact</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={(e) => scrollToSection(e, 'contact')} className="hidden md:block">
            <span className="liquid-glass rounded-full text-foreground px-6 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-white/60 transition-colors inline-block">
              Enquire
            </span>
          </button>
          <Link href="/login" className="hidden md:block">
            <button className="liquid-glass rounded-full text-foreground px-6 py-2 text-xs uppercase tracking-widest font-semibold hover:bg-white/60 transition-colors">
              Login
            </button>
          </Link>
          <button
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden liquid-glass rounded-full text-foreground p-2 flex items-center justify-center h-11 w-11 hover:bg-white/60"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="liquid-glass p-6 flex flex-col gap-6 md:hidden text-center shadow-lg absolute left-0 right-0 top-full z-50 rounded-b-3xl border-t-0 mt-2 mx-4">
            <button onClick={(e) => scrollToSection(e, 'home')} className="text-foreground uppercase text-xs tracking-widest font-semibold flex-1">Home</button>
            <button onClick={(e) => scrollToSection(e, 'collection')} className="text-foreground uppercase text-xs tracking-widest font-semibold flex-1">Collection</button>
            <button onClick={(e) => scrollToSection(e, 'about')} className="text-foreground uppercase text-xs tracking-widest font-semibold flex-1">About Us</button>
            <button onClick={(e) => scrollToSection(e, 'contact')} className="text-foreground uppercase text-xs tracking-widest font-semibold flex-1">Contact</button>
            <Link href="/login" className="text-foreground uppercase text-xs tracking-widest font-semibold liquid-glass py-3 mx-4" onClick={() => setMobileMenuOpen(false)}>Admin Login</Link>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <video
          poster="https://images.unsplash.com/photo-1601053075253-06d20392f4ac?q=80&w=2000&auto=format&fit=crop"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="https://labs.google/fx/api/og-video/shared/16658c07-d8e4-4b21-b6cf-bb1e2ed37763" type="video/mp4" />
          <img src="https://images.unsplash.com/photo-1601053075253-06d20392f4ac?q=80&w=2000&auto=format&fit=crop" alt="Hero background" className="absolute inset-0 w-full h-full object-cover z-0" />
        </video>
        <div className="absolute inset-0 bg-black/50 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-warm-white via-transparent to-transparent opacity-40 z-0"></div>

        <div className="relative z-10 max-w-3xl flex flex-col items-center">
          <FadeIn delay={200} duration={1000}>
            <span className="text-white uppercase tracking-[0.2em] text-xs font-semibold mb-6 block drop-shadow-lg">
              WELCOME TO THE PADMAVATI CORPORATION
            </span>
          </FadeIn>

          <AnimatedHeading
            text="The Divine in Brass"
            startDelay={400}
          />

          <FadeIn delay={800} duration={1000}>
            <p className="text-base md:text-lg text-white mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
              Experience the spiritual weight of heritage craftsmanship. Each piece is a sacred artifact, forged with devotion and timeless artistry.
            </p>
          </FadeIn>

          <FadeIn delay={1200} duration={1000}>
            <button onClick={(e) => scrollToSection(e, 'collection')} className="liquid-glass rounded-full border-white/50 text-foreground px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-white/50 transition-colors shadow-lg">
              EXPLORE THE COLLECTION
            </button>
          </FadeIn>
        </div>
      </section>

      {/* Artisan Section */}
      <section id="about" className="relative z-10 py-24 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-center mb-16">
          <div className="h-px bg-brass-light/50 flex-grow max-w-[200px]"></div>
          <div className="px-4 text-[#D9BE6C]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C12 22 17 18 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 18 12 22 12 22Z"/><path d="M12 7V2"/><path d="M12 2C10.5 2 9 3 9 5C9 7 12 7 12 7C12 7 15 7 15 5C15 3 13.5 2 12 2Z"/></svg>
          </div>
          <div className="h-px bg-brass-light/50 flex-grow max-w-[200px]"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative liquid-glass p-2 shadow-sm flex items-center justify-center min-h-[400px] overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-warm-white to-brass-light opacity-30 mix-blend-multiply"></div>
             <div className="z-10 text-center p-8">
               <Box className="w-16 h-16 mx-auto mb-4 text-brass-dark opacity-80" />
               <p className="text-brass-dark font-semibold tracking-widest uppercase text-xs">Premium Brass Artifacts</p>
             </div>
          </div>
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-display text-foreground leading-tight font-normal">
              Centuries of Devotion, Cast in Metal.
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed text-[15px]">
              <p>
                At The Padmavati Corporation, we do not merely manufacture; we manifest. Utilizing the ancient 'Ashtadhatu' and lost-wax casting techniques, our master artisans pour generations of spiritual intent into every mold.
              </p>
              <p>
                The process is a ritual in itself, resulting in murtis that are not just visually breathtaking, but energetically resonant. Each chisel strike is a prayer, every polished curve a testament to enduring faith.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Collection Section */}
      <section id="collection" className="relative z-10 py-24 bg-transparent px-6 md:px-12 lg:px-16 border-t border-foreground/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-[42px] font-display text-foreground leading-tight font-normal mb-4">
              Curated Collection
            </h2>
            <p className="text-muted-foreground text-[15px]">
              Masterpieces of devotion, ready to grace your sanctum.
            </p>
            <div className="h-px bg-brass-light w-16 mx-auto mt-6"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="liquid-glass overflow-hidden flex flex-col group transition duration-200 hover:shadow-xl hover:-translate-y-2 cursor-pointer focus-visible:ring-3 focus-visible:ring-primary/50 outline-none active:scale-[0.98]" tabIndex={0}>
              <div className="aspect-[4/5] bg-cream border-b border-foreground/10 p-4 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-warm-white/50 to-brass-light/50 opacity-40 group-hover:opacity-60 transition-opacity mix-blend-multiply"></div>
                <div className="z-10 bg-white/80 p-6 rounded-full backdrop-blur-sm border border-foreground/10 group-hover:scale-110 transition-transform duration-200">
                  <ShieldCheck className="w-12 h-12 text-brass-dark" />
                </div>
              </div>
              <div className="p-8 text-center flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-2xl text-foreground mb-2 font-normal group-hover:text-brass-dark transition-colors">Ambe Maa</h3>
                  <p className="text-brass-dark text-[10px] uppercase tracking-[0.15em] font-bold mb-4">Goddess of Power & Protection</p>
                  <p className="text-muted-foreground text-[13px] leading-relaxed mb-6 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    Radiating fierce grace, this murti embodies the supreme protective energy of the Divine Mother.
                  </p>
                </div>
              </div>
            </div>

            <div className="liquid-glass overflow-hidden flex flex-col group transition duration-200 hover:shadow-xl hover:-translate-y-2 cursor-pointer focus-visible:ring-3 focus-visible:ring-primary/50 outline-none active:scale-[0.98]" tabIndex={0}>
              <div className="aspect-[4/5] bg-cream border-b border-foreground/10 p-4 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-warm-white/50 to-brass-light/50 opacity-40 group-hover:opacity-60 transition-opacity mix-blend-multiply"></div>
                <div className="z-10 bg-white/80 p-6 rounded-full backdrop-blur-sm border border-foreground/10 group-hover:scale-110 transition-transform duration-200">
                  <Zap className="w-12 h-12 text-brass-dark" />
                </div>
              </div>
              <div className="p-8 text-center flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-2xl text-foreground mb-2 font-normal group-hover:text-brass-dark transition-colors">Lakshmi</h3>
                  <p className="text-brass-dark text-[10px] uppercase tracking-[0.15em] font-bold mb-4">Embodiment of Wealth</p>
                  <p className="text-muted-foreground text-[13px] leading-relaxed mb-6 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    Invite abundance and prosperity into your space with this exquisitely detailed manifestation.
                  </p>
                </div>
              </div>
            </div>

            <div className="liquid-glass overflow-hidden flex flex-col group transition duration-200 hover:shadow-xl hover:-translate-y-2 cursor-pointer focus-visible:ring-3 focus-visible:ring-primary/50 outline-none active:scale-[0.98]" tabIndex={0}>
              <div className="aspect-[4/5] bg-cream border-b border-foreground/10 p-4 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-warm-white/50 to-brass-light/50 opacity-40 group-hover:opacity-60 transition-opacity mix-blend-multiply"></div>
                <div className="z-10 bg-white/80 p-6 rounded-full backdrop-blur-sm border border-foreground/10 group-hover:scale-110 transition-transform duration-200">
                  <Box className="w-12 h-12 text-brass-dark" />
                </div>
              </div>
              <div className="p-8 text-center flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-2xl text-foreground mb-2 font-normal group-hover:text-brass-dark transition-colors">Ganesha</h3>
                  <p className="text-brass-dark text-[10px] uppercase tracking-[0.15em] font-bold mb-4">Lord of Beginnings</p>
                  <p className="text-muted-foreground text-[13px] leading-relaxed mb-6 px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    The remover of obstacles, crafted to bring wisdom and auspicious starts to any endeavor.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 w-full liquid-glass overflow-hidden p-2 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3 p-6 md:p-8 flex flex-col justify-center text-left">
              <p className="text-brass-dark text-[10px] uppercase tracking-[0.15em] font-bold mb-4">Visit Our Store</p>
              <h3 className="font-display text-2xl text-foreground mb-6 font-normal">Our Location</h3>
              <div className="space-y-4 text-muted-foreground text-[13px] leading-relaxed">
                <p className="font-semibold text-foreground">The Padmavati Corporation</p>
                <p>123 Industrial Area, Phase II<br/>Jamnagar, Gujarat 361004, India</p>
                <p className="pt-2"><span className="font-semibold text-foreground">Phone:</span> +91 98765 43210</p>
                <p><span className="font-semibold text-foreground">Email:</span> sales@padmavaticorp.com</p>
              </div>
            </div>
            <div className="w-full md:w-2/3 h-[300px] md:h-auto bg-white relative overflow-hidden flex-shrink-0 rounded-2xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d117865.75168051664!2d70.00030588820464!3d22.469796062137682!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395715494d4d6829%3A0xc3e655bbcf1a58eb!2sJamnagar%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1703666000000!5m2!1sen!2sin"
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Location"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 bg-transparent py-8 px-6 md:px-12 lg:px-16 border-t border-foreground/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="font-display text-[22px] tracking-widest font-semibold text-brass-dark mb-1">THE PADMAVATI CORPORATION</h2>
            <p className="text-muted-foreground text-xs">The Divine in Brass</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-xs text-muted-foreground font-semibold tracking-wide uppercase">
          </div>

          <div className="text-xs text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} The Padmavati Corporation. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
