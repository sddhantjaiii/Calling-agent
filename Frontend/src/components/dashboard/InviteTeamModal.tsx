import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { Link, X, ChevronRight } from "lucide-react";
import CollaboratorsModal from "./CollaboratorsModal";
import { validateField, validationSchemas } from "@/utils/formValidation";

// Replace team member names as requested
const MOCK_TEAM_MEMBERS = [
  { name: "Pravalika", color: "bg-pink-400", initial: "P", role: "Admin" },
  { name: "Siddhant", color: "bg-green-500", initial: "S", role: "Editor" },
  { name: "Nitya Jain", color: "bg-purple-400", initial: "N", role: "Viewer" },
  {
    name: "Prabhav Gupta",
    color: "bg-orange-500",
    initial: "P",
    role: "Viewer",
  },
  {
    name: "Prabhav Gupta Sniper",
    color: "bg-pink-600",
    initial: "P",
    role: "Viewer",
  },
  {
    name: "Priyanshu Sharma",
    color: "bg-stone-600",
    initial: "P",
    role: "Editor",
  },
  {
    name: "Siddhant Jaiswal",
    color: "bg-sky-800",
    initial: "S",
    role: "Viewer",
  },
  {
    name: "sniperthink (you)",
    color: "bg-purple-500",
    initial: "S",
    role: "Owner",
  },
  {
    name: "Vasu Gupta",
    color: "bg-gray-100 text-gray-800",
    initial: "VG",
    role: "Viewer",
  },
];

interface InviteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers?: Array<{
    name: string;
    color: string;
    initial: string;
    role: string;
  }>;
  showMembersSection?: boolean;
}

export default function InviteTeamModal({
  open,
  onOpenChange,
  teamMembers = [],
  showMembersSection = false,
}: InviteTeamModalProps) {
  const [emails, setEmails] = useState("");
  const [inviteStatus, setInviteStatus] = useState<null | string>(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [touched, setTouched] = useState<boolean>(false);

  // Ensure replacements in explicit teamMembers as well
  const replaceNames = (members: typeof MOCK_TEAM_MEMBERS) =>
    members.map((member) => {
      if (member.name === "Anshu Chauhan")
        return { ...member, name: "Pravalika", initial: "P" };
      if (member.name === "Ashish Ranjan")
        return { ...member, name: "Siddhant", initial: "S" };
      return member;
    });

  const membersToShow =
    teamMembers.length >= 2 ? replaceNames(teamMembers) : MOCK_TEAM_MEMBERS;

  const handleEmailChange = (value: string) => {
    setEmails(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }
  };

  const handleEmailBlur = () => {
    setTouched(true);
    
    // Validate emails on blur
    const schema = validationSchemas.teamInvite;
    const result = validateField(emails, schema.emails, 'emails');
    if (!result.isValid && result.error) {
      setValidationError(result.error);
    }
  };

  const validateEmails = (): boolean => {
    const schema = validationSchemas.teamInvite;
    const result = validateField(emails, schema.emails, 'emails');
    setValidationError(result.error || "");
    setTouched(true);
    return result.isValid;
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmails()) {
      return;
    }
    
    setInviteStatus(`Invite sent to ${emails.split(",")[0].trim()}`);
    setTimeout(() => {
      setInviteStatus(null);
      onOpenChange(false);
      setEmails("");
      setValidationError("");
      setTouched(false);
    }, 1400);
  };

  // summary display
  const summaryNames = `${membersToShow[0]?.name}, ${
    membersToShow[1]?.name
  } and ${membersToShow.length - 2} others`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="
            border-none rounded-[18px] p-0 bg-[#23252b] w-[410px] max-w-[94vw] shadow-xl 
            flex flex-col items-stretch
            "
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: 300,
          }}
        >
          {/* Header: close (X) button added, copy link remains removed */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#393B40]">
            <div className="font-medium text-[15px] text-gray-200 truncate">
              Share to selection{" "}
              <span className="text-white font-semibold">
                &quot;Landing Page&quot;
              </span>
            </div>
          </div>
          {/* Invite field/row */}
          {inviteStatus ? (
            <div className="py-16 text-center text-green-700 font-semibold text-lg">
              {inviteStatus}
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="px-5 pt-5 pb-0">
              {/* Email input and Invite button */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <ValidatedInput
                    placeholder="Emails, comma separated"
                    value={emails}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    type="email"
                    autoFocus
                    required
                    error={validationError}
                    touched={touched}
                    className="bg-[#191A1C] border border-[#35373B] text-gray-100 placeholder:text-gray-400 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 h-10 text-[15px]"
                    style={{
                      fontSize: 15,
                    }}
                    description="Enter email addresses separated by commas"
                  />
                </div>
                <Button
                  disabled={!emails.trim()}
                  type="submit"
                  className={`h-10 min-w-[60px] text-[15px] font-semibold tracking-normal 
                    ${
                      emails.trim()
                        ? "bg-[#2E2F33] text-white border-[#2E2F33]"
                        : "bg-[#23252b] text-gray-400 border-[#23252b]"
                    } 
                    rounded-lg shadow-none border px-3 ml-1 transition`}
                >
                  Invite
                </Button>
              </div>

              {/* Team members row */}
              <button
                type="button"
                aria-label="View all collaborators"
                onClick={() => setShowCollaborators(true)}
                className="
                  flex items-center w-full rounded pt-3 pb-2 px-0 hover:bg-[#242528] transition cursor-pointer select-none
                "
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                }}
              >
                {/* Avatars (single row) */}
                <div className="flex items-center whitespace-nowrap">
                  {membersToShow.slice(0, 2).map((member, idx) => (
                    <span
                      key={idx}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mr-1 ring-2 ring-white ${member.color}`}
                    >
                      {member.initial}
                    </span>
                  ))}
                </div>
                {/* Summary names/arrow in the same horizontal flex */}
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <span className="text-gray-200 text-[15px] font-medium truncate">
                    {summaryNames}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Collaborators Modal (unchanged logic) */}
      <CollaboratorsModal
        open={showCollaborators}
        onOpenChange={setShowCollaborators}
        collaborators={membersToShow}
      />
    </>
  );
}
