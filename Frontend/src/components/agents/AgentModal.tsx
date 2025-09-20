import React from "react";

export interface Agent {
  id: number;
  name: string;
  type: string;
  language: string;
  description: string;
  doc: string | null;
  created: string;
  status: string;
  model: string;
  conversations: number;
  creditsRemaining: number;
}

interface AgentModalProps {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSave: (agent: Agent) => void;
  children?: React.ReactNode;
}

export function AgentModal({
  open,
  agent,
  onClose,
  onSave,
  children,
}: AgentModalProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 24,
          borderRadius: 8,
          minWidth: 300,
        }}
      >
        <button
          onClick={onClose}
          style={{
            float: "right",
            fontWeight: "bold",
            fontSize: 18,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {children || <div>Agent Modal Content</div>}
        <button
          onClick={() => agent && onSave(agent)}
          style={{ marginTop: 16 }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
