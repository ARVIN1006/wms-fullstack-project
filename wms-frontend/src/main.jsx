import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { registerChartComponents } from "./utils/chartSetup.js";
import axios from "axios";

// Set Axios Base URL from environment variable
// In development this might be http://localhost:5000 or empty if using proxy
// In production this will be your deployed backend URL
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

registerChartComponents();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
