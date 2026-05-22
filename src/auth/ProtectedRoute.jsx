import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
    const { loading, session } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="auth-route-loading">
                Carregando...
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}
