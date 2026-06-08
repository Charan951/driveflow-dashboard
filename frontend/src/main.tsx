import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { TrackingProvider } from "./context/TrackingProvider";
import { serviceService } from "./services/serviceService";
import { heroService } from "./services/heroService";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Pre-fetch critical API data to eliminate the network waterfall delay and store in cache
queryClient.prefetchQuery({
  queryKey: ['services'],
  queryFn: () => serviceService.getServices(),
}).catch(() => {});

queryClient.prefetchQuery({
  queryKey: ['heroSettings'],
  queryFn: heroService.getHeroSettings,
}).catch(() => {});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TrackingProvider>
      <App />
    </TrackingProvider>
  </QueryClientProvider>
);
