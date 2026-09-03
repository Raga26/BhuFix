import "./App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ClockInAuthProvider } from "./context/ClockInAuthContext";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { canSeePublish } from "./lib/access";
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
import SeoView from "./components/dashboard/views/SeoView";
import WebView from "./components/dashboard/views/WebView";
import CompetitorsView from "./components/dashboard/views/CompetitorsView";
import StrategyView from "./components/dashboard/views/StrategyView";
import AssetsView from "./components/dashboard/views/AssetsView";
import ChatView from "./components/dashboard/views/ChatView";
import KPIView from "./components/dashboard/views/KPIView";
import UsersView from "./components/dashboard/views/UsersView";
import TasksView from "./components/dashboard/views/TasksView";
import PackagesView from "./components/dashboard/views/PackagesView";
import InvoicesView from "./components/dashboard/views/InvoicesView";
import ClipView from "./components/dashboard/views/ClipView";
import ApprovalsView from "./components/dashboard/views/ApprovalsView";
import PublishQueueView from "./components/dashboard/views/PublishQueueView";
import PerformanceView from "./components/dashboard/views/PerformanceView";
import InsightsView from "./components/dashboard/views/InsightsView";
import AuditView from "./components/dashboard/views/AuditView";
import ClockInLandingPage from "./pages/clockin/ClockInLandingPage";
import ClockInLoginPage from "./pages/clockin/ClockInLoginPage";
import ClockInRegisterPage from "./pages/clockin/ClockInRegisterPage";
import ClockInAppPage from "./pages/clockin/ClockInAppPage";
import ClockInDisplayPage from "./pages/clockin/ClockInDisplayPage";
import ClockInPunchPage from "./pages/clockin/ClockInPunchPage";

function HomePage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  if (user && params.get("site") !== "1") {
    return <Navigate to="/dashboard" replace />;
  }
  return (
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
}

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
                <Toaster position="top-center" richColors />
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
                      <ProtectedRoute permission="clients.read">
                        <ClientsView />
                      </ProtectedRoute>
                    } />
                    <Route path="clients/:clientId/post-report" element={
                      <ProtectedRoute permission="post_reports.read">
                        <PostReportView />
                      </ProtectedRoute>
                    } />
                    <Route path="calendar" element={
                      <ProtectedRoute permission="calendar.read">
                        <CalendarView />
                      </ProtectedRoute>
                    } />
                    <Route path="publish" element={
                      <ProtectedRoute permission="calendar.read" allow={canSeePublish}>
                        <PublishQueueView />
                      </ProtectedRoute>
                    } />
                    <Route path="approvals" element={
                      <ProtectedRoute permission="approvals.read">
                        <ApprovalsView />
                      </ProtectedRoute>
                    } />
                    <Route path="tasks" element={
                      <ProtectedRoute permission="tasks.read">
                        <TasksView />
                      </ProtectedRoute>
                    } />
                    <Route path="ads" element={
                      <ProtectedRoute permission="ads.read">
                        <AdsView />
                      </ProtectedRoute>
                    } />
                    <Route path="performance" element={
                      <ProtectedRoute permission="performance.read">
                        <PerformanceView />
                      </ProtectedRoute>
                    } />
                    <Route path="insights" element={
                      <ProtectedRoute permission="insights.read">
                        <InsightsView />
                      </ProtectedRoute>
                    } />
                    <Route path="seo" element={
                      <ProtectedRoute permission="seo.read">
                        <SeoView />
                      </ProtectedRoute>
                    } />
                    <Route path="web" element={
                      <ProtectedRoute permission="web.read">
                        <WebView />
                      </ProtectedRoute>
                    } />
                    <Route path="competitors" element={
                      <ProtectedRoute permission="competitors.read">
                        <CompetitorsView />
                      </ProtectedRoute>
                    } />
                    <Route path="strategy" element={
                      <ProtectedRoute permission="strategy.read">
                        <StrategyView />
                      </ProtectedRoute>
                    } />
                    <Route path="drive" element={
                      <ProtectedRoute permission="assets.read">
                        <AssetsView />
                      </ProtectedRoute>
                    } />
                    <Route path="clip" element={
                      <ProtectedRoute permission="clips.read">
                        <ClipView />
                      </ProtectedRoute>
                    } />
                    <Route path="chat" element={
                      <ProtectedRoute permission="chat.read">
                        <ChatView />
                      </ProtectedRoute>
                    } />
                    <Route path="messages" element={<Navigate to="/dashboard/chat" replace />} />
                    <Route path="kpis" element={
                      <ProtectedRoute permission="kpis.read">
                        <KPIView />
                      </ProtectedRoute>
                    } />
                    <Route path="packages" element={
                      <ProtectedRoute permission="packages.read">
                        <PackagesView />
                      </ProtectedRoute>
                    } />
                    <Route path="invoices" element={
                      <ProtectedRoute permission="invoices.read">
                        <InvoicesView />
                      </ProtectedRoute>
                    } />
                    <Route path="users" element={
                      <ProtectedRoute permission="users.read">
                        <UsersView />
                      </ProtectedRoute>
                    } />
                    <Route path="audit" element={
                      <ProtectedRoute permission="audit.read">
                        <AuditView />
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
