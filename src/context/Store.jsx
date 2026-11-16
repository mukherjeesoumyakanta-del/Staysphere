import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { read, write, authService } from "../services";
import { listingApiService } from "../services/listingApiService";

const Store = createContext();

export function StoreProvider({ children }) {
  const [state, set] = useState(() => ({ ...read() })),
    [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(true),
    [authError, setAuthError] = useState("");

  // API-backed listings state
  const [apiListings, setApiListings] = useState(null); // null = not yet fetched
  const [listingsLoading, setListingsLoading] = useState(false);

  const restoreId = useRef(0);
  const refresh = () => set({ ...read() });

  /**
   * Fetch all public listings from the API and cache them in state.
   * Falls back to local mock data if the API is unavailable.
   */
  const refreshApiListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const result = await listingApiService.getListings({ page: 1 });
      setApiListings(result.data.listings);
    } catch {
      // Keep null so components know to show mock data or empty
      setApiListings(null);
    } finally {
      setListingsLoading(false);
    }
  }, []);

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

  // Fetch API listings on mount
  useEffect(() => {
    refreshApiListings();
  }, [refreshApiListings]);

  const reset = () => {
    localStorage.removeItem("staysphere-v1");
    location.href = "/";
  };

  // Merge: prefer API listings when available, else fall back to local mock
  const listings = apiListings !== null ? apiListings : state.listings;

  return (
    <Store.Provider
      value={{
        ...state,
        listings,
        listingsLoading,
        apiListings,
        refreshApiListings,
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
