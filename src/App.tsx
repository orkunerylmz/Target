import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Sidebar, { Page } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import { Goal } from "./types/goal";
import { AppSettings, DEFAULT_SETTINGS } from "./types/settings";
import { TargetIcon } from "./components/Icons";
import "./styles/global.css";

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedGoals, loadedSettings] = await Promise.all([
          invoke<Goal[]>("load_goals"),
          invoke<AppSettings>("load_settings"),
        ]);
        setGoals(loadedGoals);
        setSettings(loadedSettings);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  if (loading) {
    return (
      <div className="app-loading">
        <span className="loading-icon">
          <TargetIcon size={40} />
        </span>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <Dashboard
            goals={goals}
            settings={settings}
            onGoalsChange={setGoals}
            onNavigate={(page) => setActivePage(page)}
          />
        );
      case "goals":
        return (
          <Goals
            goals={goals}
            settings={settings}
            onGoalsChange={setGoals}
          />
        );
      case "notifications":
        return (
          <Notifications
            settings={settings}
            onSettingsChange={setSettings}
          />
        );
      case "settings":
        return (
          <Settings
            settings={settings}
            onSettingsChange={setSettings}
          />
        );
    }
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
};

export default App;
