import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ClockInAuthProvider } from "./context/ClockInAuthContext";
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
import PostReportView from "./components/dashboard/views/PostReportView";
import CalendarView from "./components/dashboard/views/CalendarView";
import AdsView from "./components/dashboard/views/AdsView";
import StrategyView from "./components/dashboard/views/StrategyView";
import DriveView from "./components/dashboard/views/DriveView";
import ChatView from "./components/dashboard/views/ChatView";
import KPIView from "./components/dashboard/views/KPIView";
import UsersView from "./components/dashboard/views/UsersView";
import ClockInLandingPage from "./pages/clockin/ClockInLandingPage";
import ClockInLoginPage from "./pages/clockin/ClockInLoginPage";
import ClockInRegisterPage from "./pages/clockin/ClockInRegisterPage";
import ClockInAppPage from "./pages/clockin/ClockInAppPage";
import ClockInDisplayPage from "./pages/clockin/ClockInDisplayPage";
import ClockInPunchPage from "./pages/clockin/ClockInPunchPage";

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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.info("Page hidden/minimized");
      } else {
        logger.info("Page visible/focused");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleError = (event) => {
      logger.error("Unhandled error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener("error", handleError);

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
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ClockInAuthProvider>
            <div className="App">
              <BrowserRouter>
                <Toaster position="top-right" richColors />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* BhuFix ClockIN — separate product */}
                  <Route path="/clockin" element={<ClockInLandingPage />} />
                  <Route path="/clockin/login" element={<ClockInLoginPage />} />
                  <Route path="/clockin/register" element={<ClockInRegisterPage />} />
                  <Route path="/clockin/app" element={<ClockInAppPage />} />
                  <Route path="/clockin/display/:displayToken" element={<ClockInDisplayPage />} />
                  <Route path="/clockin/punch" element={<ClockInPunchPage />} />

                  {/* Legacy redirects */}
                  <Route path="/hajri" element={<ClockInLandingPage />} />
                  <Route path="/hajri/*" element={<ClockInLandingPage />} />

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
                      <ProtectedRoute roles={['owner']}>
                        <ClientsView />
                      </ProtectedRoute>
                    } />
                    <Route path="clients/:clientId/post-report" element={
                      <ProtectedRoute roles={['owner', 'employee']}>
                        <PostReportView />
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
                      <ProtectedRoute roles={['owner','employee','client']}>
                        <DriveView />
                      </ProtectedRoute>
                    } />
                    <Route path="chat" element={
                      <ProtectedRoute roles={['owner','employee','client']}>
                        <ChatView />
                      </ProtectedRoute>
                    } />
                    <Route path="messages" element={<Navigate to="/dashboard/chat" replace />} />
                    <Route path="kpis" element={
                      <ProtectedRoute roles={['owner','employee','client']}>
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
          </ClockInAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
