"use client";

import React, { useState } from "react";
import { AppContent } from "@/components/layout/AppContent";

const tabs = [
  { id: "profile", label: "Ho so ca nhan", icon: "person" },
  { id: "ai-pref", label: "So thich du lich (AI)", icon: "auto_awesome" },
  { id: "system", label: "Cau hinh he thong", icon: "settings" },
  { id: "security", label: "Bao mat & Tai khoan", icon: "lock" },
] as const;

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("So thich du lich (AI)");
  const [budget, setBudget] = useState("Med");
  const [styles, setStyles] = useState<string[]>([
    "Nghi duong/Chill",
    "Kham pha am thuc",
    "Chup anh check-in",
  ]);
  const [transports, setTransports] = useState<string[]>(["Xe may", "O to"]);
  const [diets, setDiets] = useState<string[]>(["Hai san", "Mon an dia phuong"]);

  const handleStyleToggle = (style: string) => {
    setStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  };

  const handleTransportToggle = (transport: string) => {
    setTransports((prev) =>
      prev.includes(transport) ? prev.filter((item) => item !== transport) : [...prev, transport],
    );
  };

  const handleDietToggle = (diet: string) => {
    setDiets((prev) => (prev.includes(diet) ? prev.filter((item) => item !== diet) : [...prev, diet]));
  };

  return (
    <AppContent variant="standard" className="px-0 pt-0 sm:px-0 lg:px-0">
      <div style={{ width: '100%', marginTop: '1.5rem', padding: '0 1rem' }} className="flex flex-col gap-6">
        <div style={{ borderBottom: "2.5px solid var(--stroke-ink)", paddingBottom: 16 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 900,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Cai dat tai khoan & Thiet lap
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 650, margin: "6px 0 0" }}>
            Quan ly cau hinh tai khoan ca nhan va tuy chon so thich lap lich AI.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-2 lg:sticky lg:top-6">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "var(--radius-input)",
                    border: isActive ? "2.5px solid var(--color-brand)" : "2.5px solid var(--stroke-soft)",
                    backgroundColor: isActive ? "var(--color-brand-soft)" : "var(--color-panel)",
                    color: isActive ? "var(--color-brand-dark)" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: isActive ? "2px 2px 0 var(--stroke-ink)" : "none",
                    textAlign: "left",
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <section
            className="min-w-0 space-y-6"
            style={{
              backgroundColor: "var(--color-panel)",
              border: "3px solid var(--stroke-ink)",
              borderRadius: "var(--radius-card)",
              padding: 24,
              boxShadow: "var(--shadow-card)",
              fontFamily: "'Be Vietnam Pro', sans-serif",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span className="material-symbols-outlined" style={{ color: "var(--color-brand)" }}>
                  psychology
                </span>
                So thich du lich mac dinh
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 650, marginTop: 4, marginBottom: 0 }}>
                AI cua TripWise se uu tien su dung cac thong tin nay de tu dong thiet ke lich trinh toi uu nhat cho ban.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7A6A58",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Ngan sach mac dinh
                </label>
                <div
                  style={{
                    display: "flex",
                    backgroundColor: "var(--color-surface)",
                    borderRadius: 10,
                    padding: 3,
                    border: "1.5px solid var(--stroke-ink)",
                    maxWidth: 320,
                  }}
                >
                  {["Low", "Med", "High"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBudget(value)}
                      style={{
                        flex: 1,
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        backgroundColor: budget === value ? "var(--color-yellow)" : "transparent",
                        fontFamily: "'Be Vietnam Pro', sans-serif",
                      }}
                    >
                      {value === "Low" ? "Tiet kiem" : value === "Med" ? "Tieu chuan" : "Thoai mai"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7A6A58",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Phuong tien yeu thich
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Di bo", "Xe may", "O to", "Tau hoa/Xe bus"].map((transport) => {
                    const isSelected = transports.includes(transport);
                    return (
                      <button
                        key={transport}
                        type="button"
                        onClick={() => handleTransportToggle(transport)}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "6px 14px",
                          borderRadius: 12,
                          border: "1.5px solid var(--stroke-ink)",
                          backgroundColor: isSelected ? "var(--color-brand-soft)" : "var(--color-panel)",
                          color: isSelected ? "var(--color-brand-dark)" : "var(--text-primary)",
                          cursor: "pointer",
                          boxShadow: isSelected ? "2px 2px 0 var(--stroke-ink)" : "none",
                          transform: isSelected ? "translate(-1px, -1px)" : "none",
                          transition: "all 120ms ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {transport === "Di bo"
                            ? "directions_walk"
                            : transport === "Xe may"
                              ? "two_wheeler"
                              : transport === "O to"
                                ? "directions_car"
                                : "directions_bus"}
                        </span>
                        {transport}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7A6A58",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Phong cach du lich uu tien
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    "Nghi duong/Chill",
                    "Kham pha am thuc",
                    "Chup anh check-in",
                    "Thien nhien/Leo nui",
                    "Lich su & Van hoa",
                  ].map((style) => {
                    const isSelected = styles.includes(style);
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleStyleToggle(style)}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "6px 14px",
                          borderRadius: 12,
                          border: "1.5px solid var(--stroke-ink)",
                          backgroundColor: isSelected ? "var(--color-yellow)" : "var(--color-panel)",
                          cursor: "pointer",
                          boxShadow: isSelected ? "2px 2px 0 var(--stroke-ink)" : "none",
                          transform: isSelected ? "translate(-1px, -1px)" : "none",
                          transition: "all 120ms ease",
                        }}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#7A6A58",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Che do an uong & Di ung
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Hai san", "Mon an dia phuong", "Mon chay", "Tranh do cay"].map((diet) => {
                    const isSelected = diets.includes(diet);
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => handleDietToggle(diet)}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "6px 14px",
                          borderRadius: 12,
                          border: "1.5px solid var(--stroke-ink)",
                          backgroundColor: isSelected ? "var(--color-lime)" : "var(--color-panel)",
                          cursor: "pointer",
                          boxShadow: isSelected ? "2px 2px 0 var(--stroke-ink)" : "none",
                          transform: isSelected ? "translate(-1px, -1px)" : "none",
                          transition: "all 120ms ease",
                        }}
                      >
                        {diet}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "var(--color-lime-soft)",
                border: "2px dashed var(--stroke-ink)",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "start",
                gap: 12,
                fontFamily: "'Be Vietnam Pro', sans-serif",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--color-brand-dark)", marginTop: 2 }}>
                lightbulb
              </span>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 650, margin: 0, lineHeight: 1.5 }}>
                <strong>Meo:</strong> Ban van co the tuy chinh lai toan bo cac thong so nay tren tung chuyen di rieng biet truoc khi bam Tao lich trinh tai AI Planner.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                paddingTop: 16,
                borderTop: "2px dashed var(--stroke-light)",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-button)",
                  border: "2px solid var(--stroke-ink)",
                  backgroundColor: "var(--color-panel)",
                  cursor: "pointer",
                }}
              >
                Huy
              </button>
              <button
                type="button"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-button)",
                  border: "2px solid var(--stroke-ink)",
                  backgroundColor: "var(--color-brand)",
                  color: "var(--text-inverse)",
                  boxShadow: "2px 2px 0 var(--stroke-ink)",
                  cursor: "pointer",
                }}
              >
                Luu thay doi
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppContent>
  );
};
