import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LibraryPage } from "./pages/LibraryPage";
import { LoginPage } from "./pages/LoginPage";

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
