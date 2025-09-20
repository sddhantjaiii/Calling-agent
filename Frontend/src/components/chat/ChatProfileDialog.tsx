import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimelineCard } from "./TimelineCard";
import { ContactDisplay } from "@/components/contacts/ContactDisplay";
import { X } from "lucide-react";
import type { Lead, TimelineEntry } from "@/pages/Dashboard";

interface ChatProfileDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  dark: boolean;
}

const ChatProfileDialog = ({
  open,
  onClose,
  lead,
  dark,
}: ChatProfileDialogProps) => {
  if (!lead) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-3xl ${
          dark ? "bg-black border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <DialogHeader>
          <div className="flex items-center justify-between mb-1">
            <DialogTitle className={dark ? "text-white" : "text-gray-900"}>
              {lead.name}
            </DialogTitle>
            <button className="p-2" onClick={onClose}>
              <X className={dark ? "text-gray-300" : "text-gray-700"} />
            </button>
          </div>
        </DialogHeader>
        <div
          className={`mb-2 ${
            dark ? "text-slate-200" : "text-gray-700"
          } text-sm`}
        >
          <ContactDisplay 
            contact={{
              name: lead.name,
              email: lead.email,
              phoneNumber: lead.phone
            }}
            callSource="unknown"
            className="mb-2"
          />
          <div>Business: {lead.businessType}</div>
        </div>
        <div className="space-y-4">
          {lead.timeline?.map((entry: TimelineEntry, i: number) => (
            <TimelineCard key={i} entry={entry} dark={dark} />
          ))}
          {lead.timeline?.length === 0 && (
            <div className="italic text-gray-500">No interactions yet.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatProfileDialog;
