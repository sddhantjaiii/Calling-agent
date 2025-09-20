import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface Collaborator {
  name: string;
  color: string;
  initial: string;
  role: string;
}

interface CollaboratorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborators: Collaborator[];
}

const ROLE_LABEL: Record<string, string> = {
  Admin: "owner",
  Editor: "can edit",
  Viewer: "can view",
  Owner: "owner",
};

const ROLE_SELECT_VALUES = ["Admin", "Editor", "Viewer"];

export default function CollaboratorsModal({
  open,
  onOpenChange,
  collaborators,
}: CollaboratorsModalProps) {
  // manage editable roles in state (but do not persist)
  const [editableRoles, setEditableRoles] = useState(() =>
    collaborators.map((col) => col.role)
  );

  const handleRoleChange = (index: number, newRole: string) => {
    setEditableRoles((prev) =>
      prev.map((role, idx) => (idx === index ? newRole : role))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          border-none rounded-[18px] bg-[#23252b] w-[460px] max-w-[98vw] pt-0 pb-0 px-0 shadow-xl
          "
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          minWidth: 300,
        }}
      >
        {/* Header with only one cross */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-[#393B40]">
          <div className="font-semibold text-[17px] text-white">
            {collaborators.length} collaborators in this file
          </div>
          {/* Removed custom close button to ensure only one cross in modal */}
        </div>
        {/* List */}
        <ul className="py-1">
          {collaborators.map((user, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 px-6 py-3 border-b border-[#2C2D32] last:border-b-0 group"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold uppercase text-white ring-2 ring-white ${user.color} shrink-0`}
              >
                {user.initial}
              </span>
              <div className="flex-1 truncate">
                <span className="text-gray-200 text-[15px] font-medium">
                  {user.name}
                </span>
              </div>
              {user.role === "Owner" ? (
                <div className="text-gray-400 text-[14px] capitalize min-w-[100px] flex items-center gap-1">
                  {ROLE_LABEL["Owner"]}
                </div>
              ) : (
                <div className="min-w-[100px]">
                  <Select
                    value={editableRoles[idx]}
                    onValueChange={(val) => handleRoleChange(idx, val)}
                  >
                    <SelectTrigger className="h-8 bg-[#191A1C] border border-[#35373B] text-gray-100 text-sm">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#23252b] text-gray-100">
                      {ROLE_SELECT_VALUES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
