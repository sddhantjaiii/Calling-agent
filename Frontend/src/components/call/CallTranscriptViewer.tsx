import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Download,
  Copy,
  Clock,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import apiService from '@/services/apiService';
import type { Transcript, Call } from '@/types';

interface CallTranscriptViewerProps {
  callId: string;
  isOpen: boolean;
  onClose: () => void;
  call?: Call;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
  confidence?: number;
}

interface SearchMatch {
  segmentIndex: number;
  matchStart: number;
  matchEnd: number;
  context: string;
}

const CallTranscriptViewer: React.FC<CallTranscriptViewerProps> = ({
  callId,
  isOpen,
  onClose,
  call,
}) => {
  const { theme } = useTheme();
  
  // State management
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');

  // Load transcript data
  useEffect(() => {
    if (isOpen && callId) {
      loadTranscript();
    }
  }, [isOpen, callId]);

  const loadTranscript = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getCallTranscript(callId);
      if (response.success && response.data) {
        // Normalize backend shape (speaker_segments -> speakers, snake_case -> camelCase)
        const raw: any = response.data as any;
        const normalized = {
          id: raw.id,
          callId: raw.callId || raw.call_id,
          content: raw.content || '',
          speakers: (raw.speakers || raw.speaker_segments || []).map((s: any) => ({
            speaker: s.speaker,
            text: s.text || '',
            // Backend timestamps may be milliseconds; UI expects seconds. If value looks like ms, convert to s.
            timestamp: typeof s.timestamp === 'number' && s.timestamp > 10_000 ? Math.floor(s.timestamp / 1000) : (s.timestamp || 0),
            confidence: s.confidence,
          })),
          createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
          updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at || new Date().toISOString(),
        } as Transcript as any;
        setTranscript(normalized);
      } else {
        throw new Error(response.error?.message || 'Failed to load transcript');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transcript';
      setError(errorMessage);
      console.error('Error loading transcript:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get unique speakers from transcript
  const speakers = useMemo(() => {
    if (!transcript?.speakers) return [];
    const uniqueSpeakers = Array.from(
      new Set(transcript.speakers.map(segment => segment.speaker))
    );
    return uniqueSpeakers.sort();
  }, [transcript]);

  // Filter segments based on speaker filter
  const filteredSegments = useMemo(() => {
    if (!transcript?.speakers) return [];
    if (speakerFilter === 'all') return transcript.speakers;
    return transcript.speakers.filter(segment => segment.speaker === speakerFilter);
  }, [transcript, speakerFilter]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !transcript?.speakers) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches: SearchMatch[] = [];

    filteredSegments.forEach((segment, index) => {
      const text = segment.text.toLowerCase();
      let searchIndex = 0;
      
      while (true) {
        const matchIndex = text.indexOf(query, searchIndex);
        if (matchIndex === -1) break;
        
        // Create context around the match
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(text.length, matchIndex + query.length + 50);
        const context = segment.text.substring(contextStart, contextEnd);
        
        matches.push({
          segmentIndex: index,
          matchStart: matchIndex,
          matchEnd: matchIndex + query.length,
          context: contextStart > 0 ? '...' + context : context,
        });
        
        searchIndex = matchIndex + 1;
      }
    });

    setSearchMatches(matches);
    setCurrentMatchIndex(0);
  }, [searchQuery, filteredSegments]);

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get speaker icon
  const getSpeakerIcon = (speaker: string) => {
    const lowerSpeaker = speaker.toLowerCase();
    if (lowerSpeaker.includes('agent') || lowerSpeaker.includes('assistant')) {
      return <Bot className="w-4 h-4" />;
    }
    return <User className="w-4 h-4" />;
  };

  // Get speaker color
  const getSpeakerColor = (speaker: string) => {
    const lowerSpeaker = speaker.toLowerCase();
    if (lowerSpeaker.includes('agent') || lowerSpeaker.includes('assistant')) {
      return theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
    }
    return theme === 'dark' ? 'text-green-400' : 'text-green-600';
  };

  // Highlight search matches in text
  const highlightSearchMatches = (text: string, segmentIndex: number) => {
    if (!searchQuery.trim()) return text;

    const matches = searchMatches.filter(match => match.segmentIndex === segmentIndex);
    if (matches.length === 0) return text;

    let highlightedText = text;
    let offset = 0;

    matches.forEach(match => {
      const beforeMatch = highlightedText.substring(0, match.matchStart + offset);
      const matchText = highlightedText.substring(
        match.matchStart + offset,
        match.matchEnd + offset
      );
      const afterMatch = highlightedText.substring(match.matchEnd + offset);

      const highlightClass = theme === 'dark' 
        ? 'bg-yellow-600/30 text-yellow-200' 
        : 'bg-yellow-200 text-yellow-800';

      highlightedText = beforeMatch + 
        `<mark class="${highlightClass} px-1 rounded">${matchText}</mark>` + 
        afterMatch;

      offset += `<mark class="${highlightClass} px-1 rounded"></mark>`.length - matchText.length;
    });

    return highlightedText;
  };

  // Navigation functions
  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      newIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    }
    
    setCurrentMatchIndex(newIndex);
    
    // Scroll to the match
    const match = searchMatches[newIndex];
    const element = document.getElementById(`segment-${match.segmentIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Copy transcript to clipboard
  const copyTranscript = async () => {
    if (!transcript?.speakers) return;

    const textContent = filteredSegments
      .map(segment => {
        const timestamp = showTimestamps ? `[${formatTimestamp(segment.timestamp)}] ` : '';
        return `${timestamp}${segment.speaker}: ${segment.text}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(textContent);
      toast.success('Transcript copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy transcript');
    }
  };

  // Export transcript
  const exportTranscript = () => {
    if (!transcript?.speakers) return;

    const textContent = filteredSegments
      .map(segment => {
        const timestamp = showTimestamps ? `[${formatTimestamp(segment.timestamp)}] ` : '';
        return `${timestamp}${segment.speaker}: ${segment.text}`;
      })
      .join('\n\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${callId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Transcript exported successfully');
  };

  // Toggle segment expansion
  const toggleSegmentExpansion = (index: number) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSegments(newExpanded);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl h-[90vh] flex flex-col p-0 ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-800 text-slate-200' 
          : 'bg-white border-gray-200 text-gray-800'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-xl ${theme === "dark" ? "bg-slate-700" : "bg-slate-500"}`}>
                {call?.contactName?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{call?.contactName || 'Unknown Contact'}</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  {call?.phoneNumber}
                </p>
              </div>
            </div>
            {/* The user wants the default close button, so this one is removed. */}
            {/* <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button> */}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1.5" />
              Duration: {call?.durationSeconds ? formatTimestamp(call.durationSeconds) : 'N/A'}
            </Badge>
            <Badge variant="outline">
              <Bot className="w-3 h-3 mr-1.5" />
              Agent: {call?.agentName || 'N/A'}
            </Badge>
            <Badge variant="outline">
              Status: {call?.status}
            </Badge>
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-slate-400" />
            <span className="text-slate-400">Loading transcript...</span>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500/50" />
              <h3 className="mt-2 text-lg font-medium">Failed to load transcript</h3>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{error}</p>
              <Button size="sm" onClick={loadTranscript} className="mt-4">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {transcript && !loading && (
          <>
            {/* Controls */}
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {searchMatches.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {currentMatchIndex + 1} / {searchMatches.length}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => navigateToMatch('prev')} className="w-8 h-8">
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigateToMatch('next')} className="w-8 h-8">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyTranscript}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportTranscript}>
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Transcript Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {(!filteredSegments || filteredSegments.length === 0) ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>{speakerFilter === 'all' ? 'No transcript content available' : `No content for ${speakerFilter}`}</p>
                  </div>
                ) : (
                  filteredSegments.map((segment, index) => {
                    const isAgent = (segment.speaker || '').toLowerCase().includes('agent');
                    const isExpanded = expandedSegments.has(index);
                    const shouldTruncate = (segment.text || '').length > 300;
                    const displayText = shouldTruncate && !isExpanded ? (segment.text || '').substring(0, 300) + '...' : (segment.text || '');

                    return (
                      <div key={index} id={`segment-${index}`} className={`flex gap-3 ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        {!isAgent && (
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${theme === 'dark' ? 'bg-green-800' : 'bg-green-600'}`}>
                             {segment.speaker.charAt(0)}
                           </div>
                        )}
                        <div className={`max-w-xl p-3 rounded-lg ${isAgent ? (theme === 'dark' ? 'bg-emerald-900/50' : 'bg-emerald-100') : (theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100')}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">{segment.speaker}</span>
                            {showTimestamps && <span className="text-xs text-slate-400">{formatTimestamp(segment.timestamp)}</span>}
                          </div>
                          <p 
                            className="text-sm"
                            dangerouslySetInnerHTML={{ __html: highlightSearchMatches(displayText, index) }}
                          />
                          {shouldTruncate && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => toggleSegmentExpansion(index)}
                              className="p-0 h-auto text-xs mt-1"
                            >
                              {isExpanded ? 'Show Less' : 'Show More'}
                            </Button>
                          )}
                        </div>
                         {isAgent && (
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${theme === 'dark' ? 'bg-emerald-800' : 'bg-emerald-600'}`}>
                            A
                           </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CallTranscriptViewer;