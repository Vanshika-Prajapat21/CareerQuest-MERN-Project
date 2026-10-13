import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/services";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check the saved token

  // When the app opens, if a token exists, ask the server who we are
  useEffect(() => {
    if (!localStorage.getItem("cq_token")) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("cq_token")) // token invalid or expired
      .finally(() => setLoading(false));
  }, []);

  const saveSession = (data) => {
    localStorage.setItem("cq_token", data.token);
    setUser(data.user);
    return data.user;
  };

const login = async (email, password, role) =>
  saveSession(
    (await authApi.login({ email, password, role })).data
  );
  const register = async (form) => saveSession((await authApi.register(form)).data);

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem("cq_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
