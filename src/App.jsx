import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
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

const ReportsPage = lazy(() => import("./pages/ReportsPage"));

const THEME_STORAGE_KEY = "controlbet_theme";

function getInitialLandingTheme() {
    if (typeof window === "undefined") return "light";

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function RouteLoadingFallback() {
    return (
        <div className="auth-route-loading" role="status">
            Carregando dashboard...
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

export default function App() {
    const [landingTheme, setLandingTheme] = useState(getInitialLandingTheme);
    const location = useLocation();

    function toggleLandingTheme() {
        setLandingTheme((currentTheme) => {
            const nextTheme = currentTheme === "light" ? "dark" : "light";
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
            return nextTheme;
        });
    }

    return (
        <AuthProvider>
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
        </AuthProvider>
    );
}
