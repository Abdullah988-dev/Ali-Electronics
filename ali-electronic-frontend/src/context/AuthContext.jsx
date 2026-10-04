import { createContext, useContext, useEffect, useState } from "react";
import api from "../config/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Page refresh par token se user wapas load karo
  useEffect(() => {
    const token = localStorage.getItem("ae_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        if (err.response?.status === 401) localStorage.removeItem("ae_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ae_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async ({ name, email, phone, password }) => {
    const { data } = await api.post("/auth/register", { name, email, phone, password });
    localStorage.setItem("ae_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ae_token");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);