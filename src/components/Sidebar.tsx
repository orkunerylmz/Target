import React from "react";
import { DashboardIcon, TargetIcon, BellIcon, SettingsIcon } from "./Icons";

type Page = "dashboard" | "goals" | "notifications" | "settings";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <DashboardIcon size={18} /> },
  { id: "goals", label: "Hedefler", icon: <TargetIcon size={18} /> },
  { id: "notifications", label: "Bildirimler", icon: <BellIcon size={18} /> },
  { id: "settings", label: "Ayarlar", icon: <SettingsIcon size={18} /> },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">
          <TargetIcon size={24} />
        </span>
        <h1 className="sidebar-title">Goal Tracker</h1>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-version">v0.1.0</span>
      </div>
    </aside>
  );
};

export default Sidebar;
export type { Page };
