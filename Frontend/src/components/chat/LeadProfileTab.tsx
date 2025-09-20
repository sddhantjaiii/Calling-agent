import React, { useState, useEffect } from "react";
import { ChevronLeft, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TimelineCard } from "./TimelineCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lead, TimelineEntry, ChatMessage } from "@/pages/Dashboard";
import { useLeadProfile } from "@/hooks/useLeadProfile";
import type { LeadProfile as ApiLeadProfile } from "@/types/api";
import { ComponentErrorBoundary } from "@/components/ui/ErrorBoundaryWrapper";
import { LeadProfileLoading } from "@/components/ui/LoadingStates";
import { EmptyLeadProfile, EmptyInteractionHistory, LoadingFailed } from "@/components/ui/EmptyStateComponents";
import { ContactDisplay } from "@/components/contacts/ContactDisplay";
import ErrorHandler from "@/components/ui/ErrorHandler";

// Styled badge helper - fixed to handle undefined values
const getColor = (
  value: string | undefined,
  type: "level" | "yn" | "status"
) => {
  if (!value) {
    return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
  }

  if (type === "status" && value.toLowerCase() === "hot") {
    return "bg-red-600 text-white border-red-600 font-bold shadow-lg";
  }
  if (type === "level") {
    if (value === "High")
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
    if (value === "Medium")
      return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
    if (value === "Low")
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
  }
  if (type === "yn") {
    if (value === "Yes")
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
    if (value === "No")
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
};

// Make this function robust for any data
const transcriptParagraphsFromText = (text: unknown) => {
  if (typeof text !== "string") {
    return [];
  }
  return text
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
};

interface LeadProfileTabProps {
  lead?: Lead;
  onBack?: () => void;
}

const LeadProfileTabContent = ({ lead, onBack }: LeadProfileTabProps) => {
  // State for modal dialogs
  const [openChatEntry, setOpenChatEntry] = useState<TimelineEntry | null>(
    null
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showTranscriptEntry, setShowTranscriptEntry] =
    useState<TimelineEntry | null>(null);

  // Use the lead profile hook to fetch real data
  const { leadProfile, timeline, loading, error, refetch } = useLeadProfile(
    lead?.id?.toString() || null
  );

  // Transform API data to component format
  const [transformedLead, setTransformedLead] = useState<Lead | null>(null);
  const [timelineArray, setTimelineArray] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (leadProfile) {
      // Debug logging for data flow tracking
      console.log('LeadProfileTab: Received leadProfile data:', leadProfile);
      console.log('LeadProfileTab: Received timeline data:', timeline);

      // Transform API lead profile data to component format
      const apiData = leadProfile as any; // Backend returns different structure

      const transformed: Lead = {
        id: apiData.id || lead?.id || '',
        name: apiData.name || lead?.name || 'Unknown Lead',
        email: apiData.email || lead?.email || null,
        phone: apiData.phone || lead?.phone || '',
        company: apiData.company || lead?.company || '',
        businessType: apiData.businessType || lead?.businessType || 'SaaS',
        leadType: apiData.leadType || lead?.leadType || 'Customer',
        leadTag: apiData.leadTag || lead?.leadTag || 'Cold',
        agentType: apiData.agentType || lead?.agentType || 'CallAgent',
        interactions: apiData.interactions || lead?.interactions || 1,
        engagementLevel: apiData.engagementLevel || lead?.engagementLevel || 'Medium',
        intentLevel: apiData.intentLevel || lead?.intentLevel || 'Medium',
        budgetConstraint: apiData.budgetConstraint || lead?.budgetConstraint || 'Unknown',
        timelineUrgency: apiData.timelineUrgency || lead?.timelineUrgency || 'Medium',
        useCase: apiData.useCase || lead?.useCase || 'Interested in our services',
        followUpScheduled: apiData.followUpScheduled || lead?.followUpScheduled || '',
        demoScheduled: apiData.demoScheduled || lead?.demoScheduled || '',
      };

      setTransformedLead(transformed);

      // Transform timeline data if available
      if (timeline && Array.isArray(timeline)) {
        const transformedTimeline: TimelineEntry[] = timeline.map((entry: any) => ({
          id: entry.id || '',
          type: entry.type || 'call',
          interactionAgent: entry.interactionAgent || entry.agent || 'CallAgent-01',
          interactionDate: entry.interactionDate || entry.date || new Date().toISOString().split('T')[0],
          platform: entry.platform || 'Phone',
          leadType: entry.leadType || 'Customer',
          businessType: entry.businessType || 'SaaS',
          status: entry.status || 'completed',
          useCase: entry.useCase || 'Interested in our services',
          messages: entry.messages || null,
          duration: entry.duration || '0:00',
          engagementLevel: entry.engagementLevel || 'Medium',
          intentLevel: entry.intentLevel || 'Medium',
          budgetConstraint: entry.budgetConstraint || 'Unknown',
          timelineUrgency: entry.timelineUrgency || 'Medium',
          followUpScheduled: entry.followUpScheduled || '',
          demoScheduled: entry.demoScheduled || '',
          actions: entry.actions || 'Call completed',
          recording: entry.recording || false,
          transcript: entry.transcript || entry.transcriptContent || '',
          chatHistory: entry.chatHistory || [],
          date: entry.date || entry.interactionDate || new Date().toISOString().split('T')[0],
        }));
        setTimelineArray(transformedTimeline);
      } else {
        setTimelineArray([]);
      }
    } else if (lead) {
      // Only use passed lead data if no API data is available - no fallback mock data
      setTransformedLead(lead);
      setTimelineArray(Array.isArray(lead.timeline) ? lead.timeline : []);
    } else {
      // Clear data if no lead profile or lead data is available
      setTransformedLead(null);
      setTimelineArray([]);
    }
  }, [leadProfile, timeline, lead]);

  const interactionsCount = timelineArray.length;

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-full px-6 py-8 relative bg-black min-h-screen">
        <div className="mb-4 flex items-center">
          <Button variant="outline" className="mr-4" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Lead Profile</h1>
        </div>
        <LeadProfileLoading />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full px-6 py-8 relative bg-black min-h-screen">
        <div className="mb-4 flex items-center">
          <Button variant="outline" className="mr-4" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Lead Profile</h1>
        </div>
        <ErrorHandler
          error={error}
          onRetry={refetch}
          maxRetries={3}
          showToast={false}
        />
      </div>
    );
  }

  // Use transformed lead data or fallback to passed lead
  const displayLead = transformedLead || lead;

  if (!displayLead) {
    return (
      <div className="w-full h-full px-6 py-8 relative bg-black min-h-screen">
        <div className="mb-4 flex items-center">
          <Button variant="outline" className="mr-4" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Lead Profile</h1>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <EmptyLeadProfile 
            leadName={leadId}
            onRefresh={refreshProfile}
            onContactLead={() => {
              // Add contact lead functionality here
              console.log('Contact lead:', leadId);
            }}
          />
        </div>
      </div>
    );
  }

  // Get chat history for the clicked timeline entry - no fallback mock data
  const getChatHistory = (entry: TimelineEntry) => {
    if (
      entry?.chatHistory &&
      Array.isArray(entry.chatHistory) &&
      entry.chatHistory.length > 0
    ) {
      return entry.chatHistory;
    }
    // Return empty array if no real chat data is available
    return [];
  };

  // Function to open the chat modal/dialog for a timeline entry
  const handleViewChat = (entry: TimelineEntry) => {
    setOpenChatEntry(entry);
  };

  // Play/Pause recording; only one active at a time
  const handlePlayRecording = (entry: TimelineEntry) => {
    if (!entry || playingId === entry.id) {
      setPlayingId(null);
    } else {
      setPlayingId(entry.id.toString());
    }
  };

  // View transcript
  const handleViewTranscript = (entry: TimelineEntry) => {
    setShowTranscriptEntry(entry);
  };

  return (
    <div className="w-full h-full px-6 py-8 relative bg-black min-h-screen">
      <div className="mb-4 flex items-center">
        {/* Back button uses onBack (to tab view) */}
        <Button variant="outline" className="mr-4" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-white">
          {displayLead.name} — Profile Details
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-gray-700 mb-3">
              {displayLead.name?.charAt(0)}
            </div>
            <h2 className="text-lg font-semibold text-white">{displayLead.name}</h2>
            <ContactDisplay 
              contact={{
                name: displayLead.name,
                email: displayLead.email,
                phoneNumber: displayLead.phone
              }}
              callSource="unknown"
              className="text-sm text-gray-400"
            />
            {/* Move Interactions here and align */}
            <div className="mt-4 flex items-center text-sm text-gray-400">
              <span className="mr-2">Interactions:</span>
              <span className="text-lg font-bold text-white">
                {interactionsCount}
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div>
              <span className="font-medium text-gray-300">Business Type: </span>
              {displayLead.businessType || "—"}
            </div>
            <div>
              <span className="font-medium text-gray-300">Lead Type: </span>
              {displayLead.leadType || "—"}
            </div>
            <div>
              <span className="font-medium text-gray-300">Status: </span>
              {/* Highlight HOT as red badge */}
              <span
                className={`rounded-full px-2 py-1 text-xs font-bold transition ${getColor(
                  displayLead.leadTag,
                  "status"
                )}`}
              >
                {displayLead.leadTag || "Unknown"}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <span className="font-medium text-gray-300">Queries/Use Case:</span>
            <div className="italic text-gray-300">{displayLead.useCase || "—"}</div>
          </div>

          {/* Lead Analytics Section */}
          <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="font-medium text-gray-300 mb-3">Lead Analytics</h3>
            {leadProfile && (leadProfile as any).totalScore !== undefined ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Total Score:</span>
                  <span className="text-sm font-bold text-white">
                    {Math.round((leadProfile as any).totalScore || 0)}/100
                  </span>
                </div>
                {(leadProfile as any).scores && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Intent:</span>
                      <span className="text-sm text-white">
                        {Math.round((leadProfile as any).scores.intent || 0)}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Urgency:</span>
                      <span className="text-sm text-white">
                        {Math.round((leadProfile as any).scores.urgency || 0)}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Budget:</span>
                      <span className="text-sm text-white">
                        {Math.round((leadProfile as any).scores.budget || 0)}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Fit:</span>
                      <span className="text-sm text-white">
                        {Math.round((leadProfile as any).scores.fit || 0)}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Engagement:</span>
                      <span className="text-sm text-white">
                        {Math.round((leadProfile as any).scores.engagement || 0)}/100
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 italic">No analytics data available</p>
                <p className="text-sm text-gray-500 mt-2">Lead scoring will appear here when available.</p>
              </div>
            )}
          </div>

          {/* CTA Interactions Section */}
          <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="font-medium text-gray-300 mb-3">CTA Interactions</h3>
            {leadProfile && (leadProfile as any).ctaInteractions ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries((leadProfile as any).ctaInteractions).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className={`font-medium ${value ? 'text-green-400' : 'text-red-400'}`}>
                      {value ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 italic">No CTA interaction data available</p>
                <p className="text-sm text-gray-500 mt-2">Call-to-action interactions will appear here when available.</p>
              </div>
            )}
          </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-gray-300">
                  Engagement Level
                </div>
                <Badge
                  className={
                    getColor(displayLead.engagementLevel, "level") + " px-3 py-1 mt-1"
                  }
                >
                  {displayLead.engagementLevel || "Unknown"}
                </Badge>
              </div>
              <div>
                <div className="font-medium text-gray-300">Intent Level</div>
                <Badge
                  className={
                    getColor(displayLead.intentLevel, "level") + " px-3 py-1 mt-1"
                  }
                >
                  {displayLead.intentLevel || "Unknown"}
                </Badge>
              </div>
              <div>
                <div className="font-medium text-gray-300">
                  Budget Constraint
                </div>
                <Badge
                  className={
                    getColor(displayLead.budgetConstraint, "yn") + " px-3 py-1 mt-1"
                  }
                >
                  {displayLead.budgetConstraint || "Unknown"}
                </Badge>
              </div>
              <div>
                <div className="font-medium text-gray-300">
                  Timeline Urgency
                </div>
                <Badge
                  className={
                    getColor(displayLead.timelineUrgency, "level") + " px-3 py-1 mt-1"
                  }
                >
                  {displayLead.timelineUrgency || "Unknown"}
                </Badge>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div>
                <div className="font-medium text-gray-300">
                  Follow-up Scheduled
                </div>
                <Badge className="bg-gray-700 text-white px-3 py-1 mt-1">
                  {displayLead.followUpScheduled || "—"}
                </Badge>
              </div>
              <div>
                <div className="font-medium text-gray-300">Demo Scheduled</div>
                <Badge className="bg-gray-700 text-white px-3 py-1 mt-1">
                  {displayLead.demoScheduled || "—"}
                </Badge>
              </div>
            </div>
          </div>
          {/* Lead Reasoning Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <div className="font-semibold text-white mb-4">Lead Analysis Reasoning</div>
            {leadProfile && (leadProfile as any).reasoning ? (
              <div className="space-y-3">
                {Object.entries((leadProfile as any).reasoning).map(([key, value]) => (
                  <div key={key}>
                    <div className="font-medium text-gray-300 capitalize mb-1">
                      {key.replace(/_/g, ' ')}:
                    </div>
                    <div className="text-sm text-gray-400 italic">
                      {typeof value === 'string' && value !== 'No analysis available' ? value : 'No analysis available'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 italic">No analysis available</p>
                <p className="text-sm text-gray-500 mt-2">AI analysis will appear here when available.</p>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="font-semibold text-white mb-2">
              Interaction Timeline
            </div>
            <div className="space-y-4">
              {timelineArray.length > 0 ? (
                timelineArray.map((entry: TimelineEntry, i: number) => (
                  <TimelineCard
                    key={i}
                    entry={entry}
                    dark={true}
                    onViewChat={
                      entry.type === "chat" ? handleViewChat : undefined
                    }
                    onPlayRecording={
                      entry.recording ? handlePlayRecording : undefined
                    }
                    currentlyPlayingId={playingId}
                    onViewTranscript={
                      entry.transcript ? handleViewTranscript : undefined
                    }
                  />
                ))
              ) : (
                <EmptyInteractionHistory 
                  leadName={displayLead.name}
                  onRefresh={refreshProfile}
                  onStartConversation={() => {
                    // Add start conversation functionality here
                    console.log('Start conversation with:', displayLead.name);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Chat dialog (shows chat for selected timeline entry) */}
      {openChatEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              onClick={() => setOpenChatEntry(null)}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-lg font-semibold mb-4 text-black flex items-center">
              <span className="mr-2">Chat Conversation —</span>
              <span className="text-blue-600">{displayLead.name}</span>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Render entire chat history */}
              {getChatHistory(openChatEntry as TimelineEntry)?.length > 0 ? (
                getChatHistory(openChatEntry as TimelineEntry).map(
                  (msg: ChatMessage, idx: number) => (
                    <div
                      key={idx}
                      className={`flex ${msg.from === "Agent" ? "justify-end" : "justify-start"
                        }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-xs break-words ${msg.from === "Agent"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-900"
                          }`}
                      >
                        <div className="text-sm">{msg.message}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <p className="text-lg font-medium">No chat data available</p>
                  <p className="text-sm mt-2">This interaction doesn't have chat history.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {showTranscriptEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative border border-gray-200 shadow-md">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold"
              onClick={() => setShowTranscriptEntry(null)}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="mb-4">
              <div className="flex items-center space-x-4">
                <span className="font-semibold text-gray-700 text-lg">
                  Call Transcript
                </span>
                <span className="text-sm text-gray-500">
                  {showTranscriptEntry.date || ""}
                </span>
              </div>
            </div>
            <div className="py-2 max-h-96 overflow-y-auto">
              <div className="text-sm leading-relaxed text-gray-700">
                {(() => {
                  // Show transcript clearly if present (either string or array)
                  const transcript = showTranscriptEntry.transcript;
                  if (typeof transcript === "string" && transcript.trim()) {
                    return transcriptParagraphsFromText(transcript).map(
                      (p, i) => (
                        <p key={i} className="mb-4">
                          {p}
                        </p>
                      )
                    );
                  }
                  if (Array.isArray(transcript) && transcript.length > 0) {
                    return transcript.map((p: string, i: number) => (
                      <p key={i} className="mb-4">
                        {p}
                      </p>
                    ));
                  }
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-lg">No transcript available</p>
                      <p className="text-sm text-gray-400 mt-2">Call transcript will appear here when available.</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LeadProfileTab = (props: LeadProfileTabProps) => {
  return (
    <ComponentErrorBoundary componentName="Lead Profile">
      <LeadProfileTabContent {...props} />
    </ComponentErrorBoundary>
  );
};

export default LeadProfileTab;
