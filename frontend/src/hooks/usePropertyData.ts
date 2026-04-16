"use client";

import { useEffect, useState } from "react";
import { getPropertyDashboard } from "@/lib/api";
import type { DashboardResponse } from "@/lib/types";

export function usePropertyData(propertyId: string) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setDashboard(null);
      setLoadingDashboard(false);
      setError(null);
      return;
    }

    let mounted = true;

    async function loadDashboard() {
      try {
        setLoadingDashboard(true);
        setError(null);
        const data = await getPropertyDashboard(propertyId);
        if (!mounted) return;
        setDashboard(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (mounted) setLoadingDashboard(false);
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [propertyId]);

  return {
    dashboard,
    loadingDashboard,
    error,
  };
}