import { useState, useEffect, useRef } from "react";
import {
  Play,
  FileText,
  Phone,
  Pause,
  Search,
  Volume2,
  Volume1,
  VolumeX,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import { CallSourceIndicator, getCallSourceFromData } from "@/components/call/CallSourceIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import CallingModal from "@/components/call/CallingModal";
import CallTranscriptViewer from "@/components/call/CallTranscriptViewer";
import Pagination from "@/components/ui/pagination";
import LazyLoader from "@/components/ui/LazyLoader";
import { useCalls } from "@/hooks/useCalls";
import { useNavigation } from "@/contexts/NavigationContext";
import type { Call, CallListOptions } from "@/types";
import { apiService } from "@/services/apiService";

interface CallLogsProps {
  activeTab: string;
  activeSubTab: string;
  useLazyLoading?: boolean;
  initialPageSize?: number;
  selectedAgents?: string[];
  onOpenProfile?: (lead: any) => void;
}

const CallLogs: React.FC<CallLogsProps> = ({
  activeTab,
  activeSubTab,
  useLazyLoading = false,
  initialPageSize = 10,
  selectedAgents,
  onOpenProfile,
}) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [showCallingModal, setShowCallingModal] = useState(false);
  const [currentCallLead, setCurrentCallLead] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null); // This will now hold the call ID of the playing audio
  const [isAudioLoading, setIsAudioLoading] = useState<string | null>(null); // Track loading state by call ID
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref to control the audio element
  const [forceUpdate, setForceUpdate] = useState(0); // Used to force re-render for progress bar
  const objectUrlRef = useRef<string | null>(null); // To keep track of the blob URL for cleanup
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'createdAt' | 'durationMinutes' | 'contactName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedCallSource, setSelectedCallSource] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [allLoadedCalls, setAllLoadedCalls] = useState<Call[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const audioProgressRef = useRef<{ [key: string]: { current: number; total: number } }>({});

  const ITEMS_PER_PAGE = initialPageSize;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when call source filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCallSource]);

  // Map camelCase to snake_case for backend
  const sortByMapping: Record<string, string> = {
    'createdAt': 'created_at',
    'durationMinutes': 'duration_minutes',
    'contactName': 'contact_name'
  };

  // Prepare options for the hook
  const callsOptions: CallListOptions = {
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
    sortBy: sortByMapping[sortBy] as 'created_at' | 'duration_minutes' | 'total_score' | 'contact_name' | 'phone_number',
    sortOrder,
  };

  const {
    calls,
    pagination,
    loading,
    error,
    refreshCalls,
    loadCall,
    loadTranscript,
  } = useCalls(callsOptions);

  // Handle lazy loading vs traditional pagination
  const displayCalls = useLazyLoading ? allLoadedCalls : calls;

  // Calculate pagination info
  const totalCalls = pagination?.total || 0;
  const totalPages = Math.ceil(totalCalls / ITEMS_PER_PAGE);
  const hasMore = pagination?.hasMore || false;

  // Filter calls based on search term, call source, and selected agents (client-side filtering for loaded data)
  const filteredCalls = displayCalls.filter((call) => {
    const matchesSearch =
      (call.contactName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      call.phoneNumber.includes(debouncedSearchTerm) ||
      call.status.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesSource = !selectedCallSource ||
      getCallSourceFromData(call) === selectedCallSource;

    // Filter by agent name since elevenlabsAgentId is not populated
    const matchesAgent = !selectedAgents || selectedAgents.length === 0 ||
      selectedAgents.includes(call.agentName || '');

    return matchesSearch && matchesSource && matchesAgent;
  });
  

  // Update accumulated calls for lazy loading
  useEffect(() => {
    if (useLazyLoading) {
      if (currentPage === 1) {
        // Reset for new search or first load
        setAllLoadedCalls(calls);
      } else {
        // Append new calls
        setAllLoadedCalls(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCalls = calls.filter(c => !existingIds.has(c.id));
          return [...prev, ...newCalls];
        });
      }
      setIsLoadingMore(false);
    }
  }, [calls, currentPage, useLazyLoading]);

  
  const handleShowTranscript = async (call: Call) => {
    try {
      const transcript = await loadTranscript(call.id);
      setSelectedCall({ ...call, transcript });
      setShowTranscript(true);
    } catch (error) {
      toast({
        title: 'Error loading transcript',
        description: 'Failed to load call transcript. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLoadMore = () => {
    if (useLazyLoading && hasMore && !loading && !isLoadingMore) {
      setIsLoadingMore(true);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortOrder('DESC');
    }
    setCurrentPage(1);
  };

  const handleCloseTranscript = () => {
    setShowTranscript(false);
    setSelectedCall(null);
  };

  const handleCall = (leadName: string, phone: string) => {
    setCurrentCallLead({ name: leadName, phone });
    setShowCallingModal(true);
  };

  const handlePlayAudio = async (callId: string) => {
    // Case 1: The user is clicking the play/pause button for the currently active audio
    if (playingAudio === callId && audioRef.current) {
      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      setForceUpdate(prev => prev + 1); // Force re-render to update play/pause icon
      return;
    }

    // Case 2: The user is playing a new audio. First, stop any currently playing audio.
    if (audioRef.current) {
      handleCloseAudio();
    }
      
      try {
        setIsAudioLoading(callId);
        setPlayingAudio(callId); // Set playing state immediately for better UX
        const audioBlob = await apiService.getCallAudioBlob(callId);
        const audioUrl = URL.createObjectURL(audioBlob);
        objectUrlRef.current = audioUrl; // Store the URL for cleanup

        audioRef.current = new Audio(audioUrl);
        setIsAudioLoading(null); // Clear loading state

        // Initialize progress for the new audio
        audioProgressRef.current[callId] = { current: 0, total: 0 };

        // Update total duration when metadata is loaded
        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current) {
            audioProgressRef.current[callId] = {
              ...audioProgressRef.current[callId],
              total: audioRef.current.duration,
            };
            setForceUpdate(prev => prev + 1); // Force re-render to show duration
          }
        };

        // Update current time as audio plays
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            audioProgressRef.current[callId] = {
              ...audioProgressRef.current[callId],
              current: audioRef.current.currentTime,
            };
            setForceUpdate(prev => prev + 1); // Force re-render for progress bar
          }
        };
        
        // Event listener to clear the playing state when audio finishes
        audioRef.current.onended = () => {
          setPlayingAudio(null);
          if (audioRef.current) {
            // Reset progress on end
            audioProgressRef.current[callId].current = 0;
            setForceUpdate(prev => prev + 1);
          }
        };

        await audioRef.current.play();

      } catch (err) {
        console.error("Error playing audio:", err);
        setIsAudioLoading(null);
        toast({
          title: 'Error playing audio',
          description: err instanceof Error ? err.message : 'Could not play the audio for this call.',
          variant: 'destructive',
        });
        setPlayingAudio(null); // Reset state on error
      }
  };

  // Effect to pause audio when navigating away from the logs sub-tab
  useEffect(() => {
    const isLogsSubTabActive = activeSubTab === 'logs';
    
    if (!isLogsSubTabActive && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setForceUpdate(prev => prev + 1); // Update UI to show paused state
    }
  }, [activeSubTab]);


  // Effect to clean up everything when the component unmounts
  useEffect(() => {
    // Return a cleanup function
    return () => {
      handleCloseAudio();
    };
  }, []); // Empty dependency array means this runs only on mount and unmount


  // Effect to handle browser tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setForceUpdate(prev => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleCloseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingAudio(null);
    setIsAudioLoading(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, callId: string) => {
    if (audioRef.current && audioProgressRef.current[callId]?.total > 0) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element.
      const width = progressBar.offsetWidth;
      const duration = audioProgressRef.current[callId].total;
      const newTime = (x / width) * duration;
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !audioRef.current.muted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5); // Restore to a sensible volume
        audioRef.current.volume = 0.5;
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) {
      return "00:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      case "cancelled":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };



  // Handle error state
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => refreshCalls()}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h2
            className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"
              }`}
          >
            Unified Call Logs
          </h2>
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : `Displaying ${filteredCalls.length} of ${totalCalls} calls`}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-gray-500"
                  }`}
              />
              <Input
                type="text"
                placeholder="Search by contact, phone, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedCallSource || "all"} onValueChange={(value) => setSelectedCallSource(value === "all" ? "" : value)}>
                <SelectTrigger className="w-auto md:w-40">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="phone">Phone Calls</SelectItem>
                  <SelectItem value="internet">Internet Calls</SelectItem>
                  <SelectItem value="unknown">Unknown Source</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(newVal) => handleSortChange(newVal as any)}>
                <SelectTrigger className="w-auto md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Sort by Date</SelectItem>
                  <SelectItem value="durationMinutes">Sort by Duration</SelectItem>
                  <SelectItem value="contactName">Sort by Contact</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                className="w-10 h-10"
              >
                {sortOrder === 'ASC' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>

        {/* Call Log Cards */}
        <div className="space-y-4">
          {loading && filteredCalls.length === 0 ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className={`p-4 animate-pulse ${theme === "dark"
                ? "bg-slate-800/50 border-slate-700"
                : "bg-white border-gray-200"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div>
                      <div className="h-5 bg-muted rounded w-32 mb-1"></div>
                      <div className="h-4 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-muted rounded w-24"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </Card>
            ))
          ) : filteredCalls.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Phone className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium dark:text-gray-200 text-gray-900 mb-2">
                  No calls found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm
                    ? `No calls match your filters.`
                    : 'No calls have been made yet.'}
                </p>
              </div>
            </Card>
          ) : (
            filteredCalls.map((call) => (
              <Card
                key={call.id}
                className={`p-0 overflow-hidden transition-all duration-200 ${theme === "dark"
                  ? "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
              >
                <div className="p-4 flex items-center justify-between">
                  {/* Left side - Contact info */}
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-lg ${theme === "dark" ? "bg-slate-700" : "bg-slate-500"}`}>
                      {call.contactName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3
                        className={`font-semibold cursor-pointer hover:underline ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                        onClick={() => handleCall(call.contactName || 'Unknown', call.phoneNumber)}
                      >
                        {call.contactName || 'Unknown Contact'}
                      </h3>
                      <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-gray-600"}`}>
                        {call.phoneNumber}
                      </p>
                    </div>
                  </div>

                  {/* Right side - Action buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShowTranscript(call)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Transcript
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handlePlayAudio(call.id)}
                      className="text-white"
                      style={{ backgroundColor: '#1A6262' }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Audio
                    </Button>
                  </div>
                </div>

                {/* Bottom section - Metadata & Audio Player */}
                <div className={`px-4 py-3 border-t ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                  {playingAudio !== call.id && isAudioLoading !== call.id ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-slate-400">Status</p>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(call.status)}`}></span>
                          <span className="font-medium">{call.status.charAt(0).toUpperCase() + call.status.slice(1)}</span>
                        </div>
                      </div>
                       <div className="space-y-1">
                        <p className="text-slate-400">Duration</p>
                        <p className="font-medium">
                          {(() => {
                            if (call.durationSeconds && !isNaN(call.durationSeconds)) {
                              const mins = Math.floor(call.durationSeconds / 60);
                              const secs = call.durationSeconds % 60;
                              return `${mins}:${String(secs).padStart(2, '0')}`;
                            }
                            if (call.displayDuration) {
                               const parts = call.displayDuration.replace(/ min| sec/g, '').split(' ').filter(Boolean);
                               if (call.displayDuration.includes('min')) {
                                 const mins = parts[0] || '0';
                                 const secs = parts[1] || '0';
                                 return `${mins}:${String(secs).padStart(2, '0')}`;
                               }
                               const secs = parts[0] || '0';
                               return `0:${String(secs).padStart(2, '0')}`;
                            }
                            if (call.durationMinutes && !isNaN(call.durationMinutes)) {
                              return `${Math.floor(call.durationMinutes)}:${String(Math.round((call.durationMinutes % 1) * 60)).padStart(2, '0')}`;
                            }
                            return '0:00';
                          })()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Agent</p>
                        <p className="font-medium">{call.agentName || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Date</p>
                        <p className="font-medium">{call.createdAt ? new Date(call.createdAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    /* Enhanced Audio Player */
                     <div
                      className={`flex items-center space-x-4 w-full`}
                    >
                      {isAudioLoading === call.id ? (
                        <div className="flex items-center justify-center w-full h-10">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                          <span className="ml-3 text-sm text-slate-400">Loading audio...</span>
                        </div>
                      ) : (
                        <>
                          {/* Play/Pause button */}
                          <button
                            onClick={() => handlePlayAudio(call.id)}
                             className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 shadow-md ${audioRef.current?.paused ? '' : 'bg-slate-600 hover:bg-slate-500'}`}
                             style={{ backgroundColor: audioRef.current?.paused ? '#1A6262' : undefined }}
                          >
                            {audioRef.current?.paused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
                          </button>

                          {/* Progress bar and time */}
                          <div className="flex items-center space-x-3 flex-1">
                            <div
                              className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 cursor-pointer"
                              onClick={(e) => handleSeek(e, call.id)}
                            >
                              <div
                                className="h-1.5 rounded-full"
                                style={{ 
                                  backgroundColor: '#1A6262',
                                  width: `${((audioProgressRef.current[call.id]?.current || 0) / (audioProgressRef.current[call.id]?.total || 1)) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <div className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[90px] text-right">
                              {formatTime(audioProgressRef.current[call.id]?.current || 0)} / {
                                (() => {
                                  if (call.durationSeconds && !isNaN(call.durationSeconds)) {
                                    const mins = Math.floor(call.durationSeconds / 60);
                                    const secs = call.durationSeconds % 60;
                                    return `${mins}:${String(secs).padStart(2, '0')}`;
                                  }
                                  if (audioProgressRef.current[call.id]?.total > 0) {
                                    return formatTime(audioProgressRef.current[call.id].total);
                                  }
                                  return '0:00';
                                })()
                              }
                            </div>
                          </div>
                          
                          <div
                            className="flex items-center space-x-1"
                            onMouseEnter={() => setShowVolumeControl(true)}
                            onMouseLeave={() => setShowVolumeControl(false)}
                          >
                            <button onClick={toggleMute} className="p-1 rounded-full transition-colors duration-200 hover:bg-slate-700">
                              {isMuted || volume === 0 ? (
                                <VolumeX className="w-5 h-5 text-slate-400" />
                              ) : volume < 0.5 ? (
                                <Volume1 className="w-5 h-5 text-slate-400" />
                              ) : (
                                <Volume2 className="w-5 h-5 text-slate-400" />
                              )}
                            </button>

                            <div className={`w-24 transition-all duration-300 ${showVolumeControl ? 'opacity-100' : 'opacity-0'}`}>
                              <Input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-full h-1 p-0 bg-transparent appearance-none cursor-pointer volume-slider"
                              />
                            </div>
                          </div>

                           <button
                            onClick={handleCloseAudio}
                            className="p-2 rounded-full transition-colors duration-200 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination or Lazy Loading */}
        {filteredCalls.length > 0 && (
          useLazyLoading ? (
            <LazyLoader
              hasMore={hasMore}
              loading={isLoadingMore}
              onLoadMore={handleLoadMore}
              threshold={200}
            />
          ) : (
            totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCalls}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )
          )
        )}

        {/* Transcript Modal */}
        {selectedCall && (
          <CallTranscriptViewer
            callId={selectedCall.id}
            isOpen={showTranscript}
            onClose={handleCloseTranscript}
            call={selectedCall}
          />
        )}
      </div>
      {/* Calling Modal, moved outside of the main div for correct JSX structure */}
      <CallingModal
        isOpen={showCallingModal}
        onClose={() => setShowCallingModal(false)}
        leadName={currentCallLead?.name}
        leadPhone={currentCallLead?.phone}
      />
    </TooltipProvider>
  );
};

export default CallLogs;
