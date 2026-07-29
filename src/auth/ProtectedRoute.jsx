import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
    useAuth();

    return children;
}
