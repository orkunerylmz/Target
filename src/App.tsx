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
import { CommandPalette } from "./components/CommandPalette";
import { SimulationModal } from "./components/SimulationModal";
import { exportBackupToJson, exportGoalsToCsv } from "./utils/exportImport";
import type { CurrencyCode } from "./utils/currency";
import "./styles/global.css";

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Command palette and simulation states
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGlobalSimulationOpen, setIsGlobalSimulationOpen] = useState(false);
  const [simulationGoalId, setSimulationGoalId] = useState<string | undefined>(undefined);

  // Load data on mount and window focus
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
      } finally {
        setLoading(false);
      }
    };

    loadData();
    window.addEventListener("focus", loadData);
    return () => window.removeEventListener("focus", loadData);
  }, []);

  // Global Keyboard Shortcuts (⌘K for command palette, ⌘N for new goal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // ⌘N or Ctrl+N -> Navigate to goals
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setActivePage("goals");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  const handleGoalsChange = async (newGoals: Goal[]) => {
    setGoals(newGoals);
    try {
      await invoke("save_goals", { goals: newGoals });
    } catch (err) {
      console.error("Failed to save goals:", err);
    }
  };

  const handleSettingsChange = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await invoke("save_settings", { settings: newSettings });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <Dashboard
            goals={goals}
            settings={settings}
            onGoalsChange={handleGoalsChange}
            onNavigate={(page) => setActivePage(page as Page)}
          />
        );
      case "goals":
        return (
          <Goals
            goals={goals}
            settings={settings}
            onGoalsChange={handleGoalsChange}
          />
        );
      case "notifications":
        return (
          <Notifications
            settings={settings}
            goals={goals}
            onSettingsChange={handleSettingsChange}
          />
        );
      case "settings":
        return (
          <Settings
            settings={settings}
            goals={goals}
            onSettingsChange={handleSettingsChange}
            onGoalsChange={handleGoalsChange}
          />
        );
    }
  };

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">{renderPage()}</main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        goals={goals}
        onNavigate={(page) => setActivePage(page as Page)}
        onOpenNewGoal={() => {
          setActivePage("goals");
        }}
        onOpenSimulation={(goalId) => {
          setSimulationGoalId(goalId || goals[0]?.id);
          setIsGlobalSimulationOpen(true);
        }}
        onOpenQuickAdd={() => {
          setActivePage("goals");
        }}
        onExportJson={() => exportBackupToJson(goals, settings)}
        onExportCsv={() => exportGoalsToCsv(goals)}
      />

      {/* Global Simulation Modal (accessible via ⌘K) */}
      <SimulationModal
        isOpen={isGlobalSimulationOpen}
        onClose={() => setIsGlobalSimulationOpen(false)}
        goals={goals}
        initialGoalId={simulationGoalId}
        defaultCurrency={settings.currency as CurrencyCode}
      />
    </div>
  );
};

export default App;
