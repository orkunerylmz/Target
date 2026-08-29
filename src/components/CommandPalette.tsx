import React, { useState, useEffect, useRef } from "react";
import { Goal } from "../types/goal";
import {
  DashboardIcon,
  TargetIcon,
  BellIcon,
  SettingsIcon,
  PlusIcon,
  CalculatorIcon,
  DownloadIcon,
  SearchIcon,
  CommandIcon,
} from "./Icons";
import { formatCurrency, CurrencyCode } from "../utils/currency";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  onNavigate: (page: string) => void;
  onOpenNewGoal: () => void;
  onOpenSimulation: (goalId?: string) => void;
  onOpenQuickAdd: (goal: Goal) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Sayfalar" | "İşlemler" | "Hedefler";
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  goals,
  onNavigate,
  onOpenNewGoal,
  onOpenSimulation,
  onOpenQuickAdd,
  onExportJson,
  onExportCsv,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build items list
  const baseItems: PaletteItem[] = [
    // Pages
    {
      id: "nav-dashboard",
      title: "Dashboard'a Git",
      subtitle: "Genel istatistikler ve özetler",
      category: "Sayfalar",
      icon: <DashboardIcon size={16} />,
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-goals",
      title: "Hedefler Sayfasına Git",
      subtitle: "Tüm aktif ve tamamlanan hedefler",
      category: "Sayfalar",
      icon: <TargetIcon size={16} />,
      action: () => {
        onNavigate("goals");
        onClose();
      },
    },
    {
      id: "nav-notifications",
      title: "Bildirimler ve Hatırlatıcılar",
      subtitle: "Akıllı bildirim ayarları ve zamanlayıcı",
      category: "Sayfalar",
      icon: <BellIcon size={16} />,
      action: () => {
        onNavigate("notifications");
        onClose();
      },
    },
    {
      id: "nav-settings",
      title: "Ayarlar Sayfasına Git",
      subtitle: "Tema, para birimi ve veri yönetimi",
      category: "Sayfalar",
      icon: <SettingsIcon size={16} />,
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },
    // Quick Actions
    {
      id: "act-new-goal",
      title: "Yeni Hedef Oluştur",
      subtitle: "Yeni bir birikim hedefi tanımla (⌘+N)",
      category: "İşlemler",
      icon: <PlusIcon size={16} />,
      action: () => {
        onClose();
        onOpenNewGoal();
      },
    },
    {
      id: "act-simulation",
      title: "Finansal Simülasyonu Aç",
      subtitle: "'Ya Şöyle Olursa?' senaryo hesaplayıcı",
      category: "İşlemler",
      icon: <CalculatorIcon size={16} />,
      action: () => {
        onClose();
        onOpenSimulation();
      },
    },
    {
      id: "act-export-json",
      title: "Tüm Verileri Yedekle (JSON)",
      subtitle: "Hedefleri ve ayarları güvenle indir",
      category: "İşlemler",
      icon: <DownloadIcon size={16} />,
      action: () => {
        onClose();
        onExportJson();
      },
    },
    {
      id: "act-export-csv",
      title: "Hedefleri Excel / CSV Olarak İndir",
      subtitle: "Tablo formatında dışa aktarma",
      category: "İşlemler",
      icon: <DownloadIcon size={16} />,
      action: () => {
        onClose();
        onExportCsv();
      },
    },
  ];

  // Dynamic Goal Items
  const goalItems: PaletteItem[] = goals.map((g) => ({
    id: `goal-${g.id}`,
    title: g.name,
    subtitle: `Birikim: ${formatCurrency(g.savedAmount, (g.currency || "TRY") as CurrencyCode)} / ${formatCurrency(g.targetAmount, (g.currency || "TRY") as CurrencyCode)}`,
    category: "Hedefler",
    icon: <TargetIcon size={16} />,
    action: () => {
      onClose();
      onOpenQuickAdd(g);
    },
  }));

  const allItems = [...baseItems, ...goalItems];

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase())) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette-box" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-palette-search-row">
          <span className="cmd-search-icon">
            <SearchIcon size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Bir sayfa, işlem veya hedef arayın..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="cmd-palette-input"
          />
          <div className="cmd-badge-hint">
            <CommandIcon size={12} />
            <span>K</span>
          </div>
        </div>

        <div className="cmd-palette-list" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="cmd-empty-state">
              <p>Eşleşen bir sonuç bulunamadı.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-palette-item ${isSelected ? "selected" : ""}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="cmd-item-icon">{item.icon}</div>
                  <div className="cmd-item-info">
                    <span className="cmd-item-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="cmd-item-sub">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="cmd-item-category">{item.category}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="cmd-palette-footer">
          <span className="cmd-footer-tip">
            <kbd>↑</kbd> <kbd>↓</kbd> Gezinme &nbsp;•&nbsp; <kbd>↵</kbd> Seç &nbsp;•&nbsp; <kbd>Esc</kbd> Kapat
          </span>
        </div>
      </div>
    </div>
  );
};
