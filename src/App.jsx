import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ScrollToTop from "./ScrollToTop";
import { AuthProvider } from "./auth/AuthProvider";
import ProtectedRoute from "./auth/ProtectedRoute";

const THEME_STORAGE_KEY = "controlbet_theme";

function getInitialLandingTheme() {
    if (typeof window === "undefined") return "light";

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
    const [landingTheme, setLandingTheme] = useState(getInitialLandingTheme);

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
                    path="/dashboard"
                    element={(
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    )}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}
