import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginRequest } from "../api/auth";
import { ApiError } from "../api/types";
import { useAuth } from "../auth/authContext";

interface LoginLocationState {
  message?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = (location.state as LoginLocationState | null)?.message;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await loginRequest({ username, password });
      login(response.token, response.user.username);
      navigate("/books", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "ไม่สามารถเข้าสู่ระบบได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-panel">
        <p className="eyebrow">PERSONAL CATALOGUE</p>
        <h1>เข้าสู่คลังหนังสือ</h1>
        {message ? <p className="login-message" role="status" aria-live="polite">{message}</p> : null}
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </main>
  );
}
