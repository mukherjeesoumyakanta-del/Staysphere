import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { read, write, authService } from "../services";
const Store = createContext();
export function StoreProvider({ children }) {
  const [state, set] = useState(() => ({ ...read() })),
    [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(true),
    [authError, setAuthError] = useState("");
  const restoreId = useRef(0);
  const refresh = () => set({ ...read() });
  const restoreSession = useCallback(async () => {
    const requestId = ++restoreId.current;
    setAuthLoading(true);
    setAuthError("");
    try {
      await authService.me();
      if (requestId === restoreId.current) setAuthError("");
    } catch (error) {
      if (requestId === restoreId.current) setAuthError(error.message);
    } finally {
      if (requestId === restoreId.current) setAuthLoading(false);
    }
  }, []);
  useEffect(() => {
    const unsubscribe = authService.subscribe(setUser);
    restoreSession();
    return unsubscribe;
  }, [restoreSession]);
  const reset = () => {
    localStorage.removeItem("staysphere-v1");
    location.href = "/";
  };
  return (
    <Store.Provider
      value={{
        ...state,
        user,
        authLoading,
        authError,
        restoreSession,
        refresh,
        reset,
        mutate: (fn) => {
          write(fn);
          refresh();
        },
      }}
    >
      {children}
    </Store.Provider>
  );
}
export const useStore = () => useContext(Store);
