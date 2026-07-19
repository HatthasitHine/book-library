import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";

function LibraryPage() {
  const { logout } = useAuth();

  return (
    <main>
      <h1>คลังหนังสือของฉัน</h1>
      <button type="button" onClick={logout}>
        ออกจากระบบ
      </button>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/books"
        element={
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/books" replace />} />
    </Routes>
  );
}

export default App;
