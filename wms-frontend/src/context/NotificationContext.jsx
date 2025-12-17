import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [alerts, setAlerts] = useState({ lowStock: [], expiry: [] });
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const fetchAlerts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Explicitly attach token to ensure it's sent, overriding defaults if needed
      const config = {
        headers: {
          "x-auth-token": token,
        },
      };
      const res = await axios.get("/api/notifications/alerts", config);
      setAlerts(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        // Token expired or invalid. AuthContext handles logout.
        // We suppress the error here to avoid console noise during background polling.
        console.warn("Notification fetch unauthorized - waiting for re-auth");
      } else {
        console.error("Failed to fetch notifications", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 300000); // Poll every 5 mins
      return () => clearInterval(interval);
    }
  }, [token]);

  const totalAlerts =
    (alerts.lowStock?.length || 0) + (alerts.expiry?.length || 0);

  return (
    <NotificationContext.Provider
      value={{ alerts, totalAlerts, loading, fetchAlerts }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
