import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import logger from "./utils/logger";
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
  useEffect(() => {
    logger.componentMount("App");
    
    // Log page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.info("Page hidden/minimized");
      } else {
        logger.info("Page visible/focused");
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Log unhandled errors
    const handleError = (event) => {
      logger.error("Unhandled error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    
    window.addEventListener("error", handleError);
    
    // Log unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      logger.error("Unhandled promise rejection", {
        reason: event.reason,
        promise: event.promise,
      });
    };
    
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    
    return () => {
      logger.componentUnmount("App");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;
