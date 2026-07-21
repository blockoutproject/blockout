import React, {createContext, useContext, useMemo, useState} from "react";
import {ApiClients, createApis} from "@/src/shared/api";

const ApiContext = createContext<ApiClients | null>(null);

export const useApis = () => {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApis must be used within ApiProvider");
  return ctx;
};

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const [apis] = useState<ApiClients>(() => createApis());
  const value = useMemo(() => apis, [apis]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};
