import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { ServicesSection } from "./components/ServicesSection";
import { CaseStudies } from "./components/CaseStudies";
import { ProjectsSection } from "./components/ProjectsSection";
import { BrandsSection } from "./components/BrandsSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { CTASection } from "./components/CTASection";
import { ContactSection } from "./components/ContactSection";
import { Footer } from "./components/Footer";

const HomePage = () => (
  <>
    <Header />
    <HeroSection />
    <AboutSection />
    <CaseStudies />
    <ServicesSection />
    <ProjectsSection />
    <BrandsSection />
    <TestimonialsSection />
    <CTASection />
    <ContactSection />
    <Footer />
  </>
);

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
