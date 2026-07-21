import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import "./App.css";
import "./dashboard-home.css";
import "./design-system/design-system.css";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PrivacyPage from "./pages/PrivacyPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsPage from "./pages/TermsPage";
import DashboardPage from "./pages/DashboardPage";
import ScrollToTop from "./ScrollToTop";
import RouteErrorBoundary from "./RouteErrorBoundary";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";

const loadReportsPage = () => import("./pages/ReportsPage");
const ReportsPage = lazy(loadReportsPage);
const canUseDevelopmentTools = import.meta.env.DEV;
const DevelopmentTools = canUseDevelopmentTools
    ? lazy(() => import("./dev/DevelopmentTools"))
    : null;

function RouteLoadingFallback() {
    return (
        <div className="auth-route-loading" role="status">
            Carregando página...
        </div>
    );
}

function RouteErrorFallback() {
    return (
        <div className="auth-route-loading route-error-fallback" role="alert">
            <p>Não foi possível carregar esta área.</p>
            <button type="button" onClick={() => window.location.reload()}>
                Recarregar
            </button>
        </div>
    );
}

function AppRoutes() {
    const location = useLocation();
    const [landingTheme, setLandingTheme] = useState("light");
    const toggleLandingTheme = () => {
        setLandingTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
    };

    useEffect(() => {
        const preloadReports = () => {
            loadReportsPage().catch(() => {
                // O fallback da rota continua responsável por uma nova tentativa.
            });
        };

        if (typeof window.requestIdleCallback === "function") {
            const idleId = window.requestIdleCallback(preloadReports);
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = window.setTimeout(preloadReports, 400);
        return () => window.clearTimeout(timeoutId);
    }, []);

    return (
        <>
            <ScrollToTop />
            <Routes>
                <Route
                    path="/"
                    element={<LandingPage landingTheme={landingTheme} onToggleTheme={toggleLandingTheme} />}
                />
                <Route
                    path="/login"
                    element={<LoginPage landingTheme={landingTheme} onToggleTheme={toggleLandingTheme} />}
                />
                <Route
                    path="/cadastro"
                    element={<RegisterPage landingTheme={landingTheme} onToggleTheme={toggleLandingTheme} />}
                />
                <Route
                    path="/register"
                    element={<RegisterPage landingTheme={landingTheme} onToggleTheme={toggleLandingTheme} />}
                />
                <Route
                    path="/redefinir-senha"
                    element={<ResetPasswordPage landingTheme={landingTheme} />}
                />
                <Route
                    path="/termos"
                    element={<TermsPage landingTheme={landingTheme} />}
                />
                <Route
                    path="/privacidade"
                    element={<PrivacyPage landingTheme={landingTheme} />}
                />
                <Route
                    path="/dashboard"
                    element={(
                        <ProtectedRoute>
                            <RouteErrorBoundary resetKey={location.pathname} fallback={<RouteErrorFallback />}>
                                <Suspense fallback={<RouteLoadingFallback />}>
                                    <DashboardPage landingTheme={landingTheme} onToggleTheme={toggleLandingTheme} />
                                </Suspense>
                            </RouteErrorBoundary>
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/relatorios"
                    element={(
                        <ProtectedRoute>
                            <RouteErrorBoundary resetKey={location.pathname} fallback={<RouteErrorFallback />}>
                                <Suspense fallback={<RouteLoadingFallback />}>
                                    <ReportsPage landingTheme={landingTheme} />
                                </Suspense>
                            </RouteErrorBoundary>
                        </ProtectedRoute>
                    )}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            {canUseDevelopmentTools && DevelopmentTools ? (
                <Suspense fallback={null}>
                    <DevelopmentTools />
                </Suspense>
            ) : null}
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
