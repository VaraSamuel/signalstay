import { useEffect, useState } from "react";
import { getPropertyDashboard } from "@/lib/api";

type DashboardResponse = any;

export function usePropertyData(propertyId: string) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) return;

    setLoading(true);

    getPropertyDashboard(propertyId)
      .then((res) => {
        setDashboard(res);
      })
      .catch((err) => {
        console.error("Failed to load dashboard", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyId]);

  return { dashboard, loading };
}
