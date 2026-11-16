import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { read, write, authService } from "../services";
import {
  listingApiService,
  favoriteApiService,
} from "../services/listingApiService";

const Store = createContext();

export function StoreProvider({ children }) {
  const [state, set] = useState(() => ({ ...read() })),
    [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(true),
    [authError, setAuthError] = useState("");

  // API-backed listings state
  const [apiListings, setApiListings] = useState(null); // null = not yet fetched
  const [listingsLoading, setListingsLoading] = useState(false);

  // API-backed favorites state (array of listing IDs)
  const [apiFavorites, setApiFavorites] = useState(null);

  const restoreId = useRef(0);
  const refresh = useCallback(() => set({ ...read() }), []);

  const mutate = useCallback((fn) => {
    write(fn);
    set({ ...read() });
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      const ids = await favoriteApiService.getFavoriteIds();
      setApiFavorites(ids);
      // keep localStorage state in sync
      write((s) => {
        s.favorites = ids;
      });
    } catch {
      // Not logged in or network issue; use local favorites
      setApiFavorites(null);
    }
  }, []);

  const toggleFavorite = useCallback(
    async (listingId) => {
      // Optimistic update locally
      write((s) => {
        s.favorites = s.favorites.includes(listingId)
          ? s.favorites.filter((x) => x !== listingId)
          : [...s.favorites, listingId];
      });
      refresh();

      // If user is authenticated, sync with server
      try {
        const res = await favoriteApiService.toggleFavorite(listingId);
        if (res && res.listingIds) {
          setApiFavorites(res.listingIds);
          write((s) => {
            s.favorites = res.listingIds;
          });
          refresh();
        }
      } catch {
        // Keep optimistic update or revert if desired
      }
    },
    []
  );

  /**
   * Fetch all public listings from the API and cache them in state.
   * Falls back to local mock data if the API is unavailable.
   */
  const refreshApiListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const result = await listingApiService.getListings({ page: 1, limit: 50 });
      setApiListings(result.data.listings || []);
    } catch {
      setApiListings([]);
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

  // Fetch API listings on mount and when user identity changes
  useEffect(() => {
    refreshApiListings();
  }, [user, refreshApiListings]);

  // Fetch API favorites when user is logged in
  useEffect(() => {
    if (user) {
      refreshFavorites();
    } else {
      setApiFavorites(null);
    }
  }, [user, refreshFavorites]);

  const reset = () => {
    localStorage.removeItem("staysphere-v1");
    location.href = "/";
  };

  // Single source of truth: real MongoDB listings combined with demo listings
  const listings =
    apiListings !== null && apiListings.length > 0
      ? apiListings
      : state.listings || [];
  const favorites = apiFavorites !== null ? apiFavorites : state.favorites;

  return (
    <Store.Provider
      value={{
        ...state,
        listings,
        listingsLoading,
        apiListings,
        refreshApiListings,
        favorites,
        toggleFavorite,
        refreshFavorites,
        user,
        authLoading,
        authError,
        restoreSession,
        refresh,
        reset,
        mutate,
      }}
    >
      {children}
    </Store.Provider>
  );
}
export const useStore = () => useContext(Store);
