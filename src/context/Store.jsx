import { createContext, useContext, useState } from "react";
import { read, write } from "../services";
const Store = createContext();
export function StoreProvider({ children }) {
  const [state, set] = useState(() => ({ ...read() }));
  const refresh = () => set({ ...read() });
  const reset = () => {
    localStorage.removeItem("staysphere-v1");
    location.href = "/";
  };
  return (
    <Store.Provider
      value={{
        ...state,
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
