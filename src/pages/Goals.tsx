import React, { useState } from "react";
import { Goal } from "../types/goal";
import { AppSettings } from "../types/settings";
import GoalCard from "../components/GoalCard";
import Modal from "../components/Modal";
import { PlusIcon, TargetIcon } from "../components/Icons";
import { invoke } from "@tauri-apps/api/core";

interface GoalsProps {
  goals: Goal[];
  settings: AppSettings;
  onGoalsChange: (goals: Goal[]) => void;
}

const emptyGoal: Omit<Goal, "id"> = {
  name: "",
  targetAmount: 0,
  savedAmount: 0,
  targetDate: undefined,
};

const Goals: React.FC<GoalsProps> = ({ goals, settings, onGoalsChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<Omit<Goal, "id">>(emptyGoal);

  // Savings modal
  const [savingsGoal, setSavingsGoal] = useState<Goal | null>(null);
  const [savingsAmount, setSavingsAmount] = useState("");

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData(emptyGoal);
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      targetDate: goal.targetDate,
      icon: goal.icon,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.targetAmount <= 0) return;

    let updated: Goal[];

    if (editingGoal) {
      updated = goals.map((g) =>
        g.id === editingGoal.id ? { ...g, ...formData } : g
      );
    } else {
      const newGoal: Goal = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...formData,
      };
      updated = [...goals, newGoal];
    }

    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setShowModal(false);
    setFormData(emptyGoal);
    setEditingGoal(null);
  };

  const handleDelete = async (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
  };

  const handleAddSavings = async () => {
    if (!savingsGoal || !savingsAmount) return;
    const amount = parseFloat(savingsAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updated = goals.map((g) =>
      g.id === savingsGoal.id
        ? { ...g, savedAmount: g.savedAmount + amount }
        : g
    );
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setSavingsGoal(null);
    setSavingsAmount("");
  };

  return (
    <div className="page goals-page">
      <div className="page-header">
        <h2 className="page-title">Hedefler</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <PlusIcon size={16} />
          <span>Yeni Hedef</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <TargetIcon size={48} />
          </span>
          <p>Henüz bir hedef oluşturmadınız.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <PlusIcon size={16} />
            <span>İlk Hedefinizi Oluşturun</span>
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={settings.currency}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onAddSavings={setSavingsGoal}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData(emptyGoal);
          setEditingGoal(null);
        }}
        title={editingGoal ? "Hedefi Düzenle" : "Yeni Hedef"}
      >
        <div className="form-group">
          <label>Hedef Adı</label>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: CFMOTO 250SR"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Hedef Tutarı</label>
            <input
              type="number"
              className="form-input"
              placeholder="250000"
              value={formData.targetAmount || ""}
              onChange={(e) =>
                setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label>Mevcut Birikim</label>
            <input
              type="number"
              className="form-input"
              placeholder="75000"
              value={formData.savedAmount || ""}
              onChange={(e) =>
                setFormData({ ...formData, savedAmount: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className="form-group">
          <label>Hedef Tarihi (Opsiyonel)</label>
          <input
            type="date"
            className="form-input"
            value={formData.targetDate || ""}
            onChange={(e) =>
              setFormData({ ...formData, targetDate: e.target.value || undefined })
            }
          />
        </div>
        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowModal(false);
              setFormData(emptyGoal);
              setEditingGoal(null);
            }}
          >
            İptal
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editingGoal ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </Modal>

      {/* Add Savings Modal */}
      <Modal
        isOpen={savingsGoal !== null}
        onClose={() => {
          setSavingsGoal(null);
          setSavingsAmount("");
        }}
        title={`Birikim Ekle – ${savingsGoal?.name || ""}`}
      >
        <div className="form-group">
          <label>Eklenecek Tutar</label>
          <input
            type="number"
            className="form-input"
            placeholder="Örn: 2500"
            value={savingsAmount}
            onChange={(e) => setSavingsAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSavingsGoal(null);
              setSavingsAmount("");
            }}
          >
            İptal
          </button>
          <button className="btn btn-primary" onClick={handleAddSavings}>
            Ekle
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Goals;
