import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isDevAuthBypassEnabled } from "./devAuth";

export default function ProtectedRoute({ children }) {
    const { loading, session, user } = useAuth();
    const location = useLocation();

    // DEV-only auth bypass for local visual QA; never enabled in production builds.
    if (isDevAuthBypassEnabled) {
        return children;
    }

    if (loading) {
        return (
            <div className="auth-route-loading">
                Carregando...
            </div>
        );
    }

    if (!session || !user?.id) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}
