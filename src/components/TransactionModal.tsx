import React, { useState } from "react";
import { Goal, Transaction, TransactionType } from "../types/goal";
import { formatCurrency, CurrencyCode } from "../utils/currency";
import { formatTurkishDate } from "../utils/date";
import { PlusIcon, TrashIcon, TrendDownIcon, TrendUpIcon } from "./Icons";
import Modal from "./Modal";

interface TransactionModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateGoal: (updated: Goal) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  goal,
  isOpen,
  onClose,
  onUpdateGoal,
}) => {
  if (!goal) return null;

  const goalCurrency = (goal.currency || "TRY") as CurrencyCode;

  // New transaction form state
  const [amountStr, setAmountStr] = useState("");
  const [centsStr, setCentsStr] = useState("");
  const [txType, setTxType] = useState<TransactionType>("deposit");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const transactions = [...(goal.transactions || [])].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const mainNum = parseFloat(amountStr.replace(/\./g, "").replace(/,/g, ".")) || 0;
    const centsNum = parseFloat(centsStr) || 0;
    const parsedAmount = mainNum + centsNum / 100;

    if (parsedAmount <= 0) {
      setError("Lütfen geçerli bir tutar girin.");
      return;
    }

    if (txType === "withdraw" && parsedAmount > goal.savedAmount) {
      setError("Çekilmek istenen tutar mevcut birikimden fazla olamaz.");
      return;
    }

    const newTx: Transaction = {
      id: "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      date: new Date().toISOString(),
      amount: parsedAmount,
      type: txType,
      note: note.trim() || undefined,
    };

    const newSavedAmount =
      txType === "deposit"
        ? goal.savedAmount + parsedAmount
        : Math.max(0, goal.savedAmount - parsedAmount);

    const updatedGoal: Goal = {
      ...goal,
      savedAmount: newSavedAmount,
      transactions: [...(goal.transactions || []), newTx],
    };

    onUpdateGoal(updatedGoal);
    setAmountStr("");
    setCentsStr("");
    setNote("");
  };

  const handleDeleteTransaction = (txId: string) => {
    const tx = goal.transactions?.find((t) => t.id === txId);
    if (!tx) return;

    const remainingTxs = (goal.transactions || []).filter((t) => t.id !== txId);
    const newSavedAmount =
      tx.type === "deposit"
        ? Math.max(0, goal.savedAmount - tx.amount)
        : goal.savedAmount + tx.amount;

    const updatedGoal: Goal = {
      ...goal,
      savedAmount: newSavedAmount,
      transactions: remainingTxs,
    };

    onUpdateGoal(updatedGoal);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${goal.name} • İşlem Geçmişi`}
      size="lg"
    >
      <div className="tx-modal-body">
        {/* Goal Summary Top Card */}
        <div className="tx-summary-card">
          <div className="tx-summary-col">
            <span className="tx-label">Mevcut Birikim</span>
            <span className="tx-saved-value">{formatCurrency(goal.savedAmount, goalCurrency)}</span>
          </div>
          <div className="tx-summary-divider" />
          <div className="tx-summary-col">
            <span className="tx-label">Hedef Tutar</span>
            <span className="tx-target-value">{formatCurrency(goal.targetAmount, goalCurrency)}</span>
          </div>
          <div className="tx-summary-divider" />
          <div className="tx-summary-col">
            <span className="tx-label">Kayıtlı İşlem</span>
            <span className="tx-count-value">{transactions.length} adet</span>
          </div>
        </div>

        {/* Add Transaction Form */}
        <form className="tx-add-form" onSubmit={handleAddTransaction}>
          <div className="tx-form-row">
            {/* Type selector */}
            <div className="tx-type-toggle">
              <button
                type="button"
                className={`tx-type-btn deposit ${txType === "deposit" ? "active" : ""}`}
                onClick={() => setTxType("deposit")}
              >
                <TrendUpIcon size={14} />
                <span>Para Yatır</span>
              </button>
              <button
                type="button"
                className={`tx-type-btn withdraw ${txType === "withdraw" ? "active" : ""}`}
                onClick={() => setTxType("withdraw")}
              >
                <TrendDownIcon size={14} />
                <span>Para Çek</span>
              </button>
            </div>

            {/* Amount input */}
            <div className="tx-amount-inputs">
              <div className="tx-input-main-wrap">
                <input
                  type="text"
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="tx-input tx-input-amount"
                  required
                />
                <span className="tx-currency-tag">{goalCurrency}</span>
              </div>
              <input
                type="text"
                placeholder="00"
                maxLength={2}
                value={centsStr}
                onChange={(e) => setCentsStr(e.target.value.replace(/\D/g, ""))}
                className="tx-input tx-input-cents"
              />
            </div>
          </div>

          <div className="tx-form-row">
            <input
              type="text"
              placeholder="Açıklama / Not (Opsiyonel - örn: Maaştan aktarım, Prim)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="tx-input tx-input-note"
            />
            <button type="submit" className="btn btn-primary tx-submit-btn">
              <PlusIcon size={15} />
              <span>İşlemi Ekle</span>
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}
        </form>

        {/* Transaction History List */}
        <div className="tx-history-list-section">
          <h4 className="tx-history-title">Geçmiş Kayıtlar</h4>
          {transactions.length === 0 ? (
            <div className="tx-empty-state">
              <p>Henüz kayıtlı bir birikim işlemi bulunmuyor.</p>
              <span>Yukarıdaki formdan ilk işleminizi kaydedebilirsiniz.</span>
            </div>
          ) : (
            <div className="tx-history-list">
              {transactions.map((tx) => {
                const isDeposit = tx.type === "deposit";
                return (
                  <div key={tx.id} className={`tx-item tx-item-${tx.type}`}>
                    <div className="tx-item-left">
                      <span className={`tx-item-icon ${isDeposit ? "icon-deposit" : "icon-withdraw"}`}>
                        {isDeposit ? <TrendUpIcon size={16} /> : <TrendDownIcon size={16} />}
                      </span>
                      <div className="tx-item-details">
                        <span className="tx-item-note">
                          {tx.note || (isDeposit ? "Birikim Ekleme" : "Birikimden Çekim")}
                        </span>
                        <span className="tx-item-date">
                          {formatTurkishDate(tx.date.slice(0, 10))} • {new Date(tx.date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="tx-item-right">
                      <span className={`tx-item-amount ${isDeposit ? "amount-plus" : "amount-minus"}`}>
                        {isDeposit ? "+" : "-"}
                        {formatCurrency(tx.amount, goalCurrency)}
                      </span>
                      <button
                        type="button"
                        className="btn-icon btn-icon-xs btn-delete-tx"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        title="İşlemi Sil"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
