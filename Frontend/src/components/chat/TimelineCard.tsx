import { Headphones, Phone, FileText, MessageSquare } from "lucide-react";
import React, { useRef } from "react";
import type { TimelineEntry } from "@/pages/Dashboard";

export const TimelineCard = ({
  entry,
  dark,
  onViewChat,
  onPlayRecording,
  currentlyPlayingId,
  onViewTranscript,
}: {
  entry: TimelineEntry;
  dark: boolean;
  onViewChat?: (entry: TimelineEntry) => void;
  onPlayRecording?: (entry: TimelineEntry) => void;
  currentlyPlayingId?: string | null;
  onViewTranscript?: (entry: TimelineEntry) => void;
}) => {
  let icon = null;
  let label = "";
  if (entry.type === "call") {
    icon = <Phone className="inline w-4 h-4 mb-1 mr-1" />;
    label = "CallAgent";
  } else if (entry.type === "chat") {
    icon = <Headphones className="inline w-4 h-4 mb-1 mr-1" />;
    label = "ChatAgent";
  }

  // Example formatting: 2024-05-12 15:14 -> 12 May, 3:14 PM
  const formatDate = (dt: string) => {
    try {
      const date = new Date(dt.replace(/-/g, "/").replace(" ", "T"));
      const formatted = date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        year: "numeric",
      });
      if (!isNaN(date.getTime())) {
        return formatted;
      }
      return new Date().toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        year: "numeric",
      });
    } catch {
      return new Date().toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        year: "numeric",
      });
    }
  };

  const queries = Array.isArray(entry.queries)
    ? entry.queries
    : entry.query
    ? [entry.query]
    : [];

  // hardcoded audio URL for demo; in real world this should come from entry
  const audioUrl =
    entry.audioUrl ||
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  const playerRef = useRef<HTMLAudioElement>(null);

  return (
    <div
      className={`rounded-lg p-4 ${
        dark ? "bg-gray-800" : "bg-gray-100"
      } border ${
        dark ? "border-gray-700" : "border-gray-200"
      } flex items-start justify-between`}
    >
      <div>
        <div className="mb-1 flex items-center gap-1 font-medium">
          {icon}
          <span>
            {label} — {formatDate(entry.date)}
          </span>
        </div>
        <div className="text-sm">{entry.actions}</div>
        {queries.length > 0 && (
          <div className="text-xs text-gray-500 mt-1 italic">
            Query{queries.length > 1 ? " (all):" : ":"}
            <ul className="list-disc ml-4 mt-1">
              {queries.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 items-end">
        {entry.type === "chat" && onViewChat && (
          <button
            className="flex items-center px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-400"
            onClick={() => onViewChat(entry)}
          >
            <MessageSquare className="inline mr-1 w-4 h-4" />
            View Chat
          </button>
        )}
        {/* Play Recording, audio inline */}
        {entry.recording && onPlayRecording && (
          <div className="flex flex-col items-end">
            <button
              className="flex items-center px-2 py-1 text-xs rounded bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-400"
              onClick={() => onPlayRecording(entry)}
            >
              <Headphones className="inline mr-1 w-4 h-4" />
              {currentlyPlayingId === entry.id
                ? "Pause Recording"
                : "Play Recording"}
            </button>
            {currentlyPlayingId === entry.id && (
              <audio
                ref={playerRef}
                src={audioUrl}
                autoPlay
                controls
                onEnded={() => onPlayRecording && onPlayRecording(null)}
                className="mt-2"
              />
            )}
          </div>
        )}
        {/* View Transcript opens modal */}
        {entry.transcript && onViewTranscript && (
          <button
            className="flex items-center px-2 py-1 text-xs rounded bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-400 mt-1"
            onClick={() => onViewTranscript(entry)}
          >
            <FileText className="inline mr-1 w-4 h-4" />
            View Transcript
          </button>
        )}
      </div>
    </div>
  );
};
