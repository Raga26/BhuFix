import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { ServicesSection } from "./components/ServicesSection";
import { PricingSection } from "./components/PricingSection";
import { BrandsSection } from "./components/BrandsSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { CTASection } from "./components/CTASection";
import { ContactSection } from "./components/ContactSection";
import { Footer } from "./components/Footer";
import { ScrollReveal } from "./components/ScrollReveal";
import NotFoundPage from "./components/NotFoundPage";

const HomePage = () => (
  <>
    <Header />
    <HeroSection />
    <ScrollReveal>
      <AboutSection />
    </ScrollReveal>
    <ScrollReveal>
      <ServicesSection />
    </ScrollReveal>
    <ScrollReveal>
      <PricingSection />
    </ScrollReveal>
    <ScrollReveal>
      <BrandsSection />
    </ScrollReveal>
    <ScrollReveal>
      <TestimonialsSection />
    </ScrollReveal>
    <ScrollReveal>
      <CTASection />
    </ScrollReveal>
    <ScrollReveal>
      <ContactSection />
    </ScrollReveal>
    <Footer />
  </>
);

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
}

export default App;
