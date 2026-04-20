import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pg_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api("/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const { token } = await api("/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });
    localStorage.setItem("pg_token", token);
    const me = await api("/me");
    setUser(me);
  }

  function logout() {
    localStorage.removeItem("pg_token");
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
