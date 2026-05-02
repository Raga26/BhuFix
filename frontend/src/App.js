import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OverviewView from "./components/dashboard/views/OverviewView";
import ClientsView from "./components/dashboard/views/ClientsView";
import CalendarView from "./components/dashboard/views/CalendarView";
import AdsView from "./components/dashboard/views/AdsView";
import StrategyView from "./components/dashboard/views/StrategyView";
import DriveView from "./components/dashboard/views/DriveView";
import ChatView from "./components/dashboard/views/ChatView";
import KPIView from "./components/dashboard/views/KPIView";
import UsersView from "./components/dashboard/views/UsersView";

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
      <AuthProvider>
        <ErrorBoundary>
          <div className="App">
            <BrowserRouter>
              <Toaster position="top-right" richColors />
              <Routes>
                {/* Public marketing site */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Protected dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<OverviewView />} />
                  <Route path="clients" element={
                    <ProtectedRoute roles={['owner','employee']}>
                      <ClientsView />
                    </ProtectedRoute>
                  } />
                  <Route path="calendar" element={<CalendarView />} />
                  <Route path="ads" element={
                    <ProtectedRoute roles={['owner','employee']}>
                      <AdsView />
                    </ProtectedRoute>
                  } />
                  <Route path="strategy" element={
                    <ProtectedRoute roles={['owner','employee']}>
                      <StrategyView />
                    </ProtectedRoute>
                  } />
                  <Route path="drive" element={
                    <ProtectedRoute roles={['owner','employee']}>
                      <DriveView />
                    </ProtectedRoute>
                  } />
                  <Route path="chat" element={
                    <ProtectedRoute roles={['owner','employee']}>
                      <ChatView />
                    </ProtectedRoute>
                  } />
                  <Route path="messages" element={
                    <ProtectedRoute roles={['owner','employee','client']}>
                      <ChatView clientThread />
                    </ProtectedRoute>
                  } />
                  <Route path="kpis" element={
                    <ProtectedRoute roles={['owner','employee']}>
                      <KPIView />
                    </ProtectedRoute>
                  } />
                  <Route path="users" element={
                    <ProtectedRoute roles={['owner']}>
                      <UsersView />
                    </ProtectedRoute>
                  } />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
