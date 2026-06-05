import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { TrackingProvider } from "./context/TrackingProvider";
import { serviceService } from "./services/serviceService";
import { heroService } from "./services/heroService";

// Pre-fetch critical API data to eliminate the network waterfall delay
serviceService.getServices().catch(() => {});
heroService.getHeroSettings().catch(() => {});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TrackingProvider>
      <App />
    </TrackingProvider>
  </QueryClientProvider>
);
