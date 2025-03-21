import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputProps {
  onResult: (transcript: string) => void;
  isProcessing?: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, isProcessing = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const recognitionRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Check network connectivity with timeout
  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      setIsOnline(true);
      return true;
    } catch (error) {
      console.error('Network connectivity test failed:', error);
      setIsOnline(false);
      return false;
    }
  };

  const cleanupRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
        recognitionRef.current = null;
        isInitializedRef.current = false;
      } catch (err) {
        console.error('Error cleaning up speech recognition:', err);
      }
    }
    setIsListening(false);
  };

  useEffect(() => {
    const handleOnline = async () => {
      const hasConnection = await checkNetworkConnection();
      if (hasConnection) {
        setIsOnline(true);
        toast.success("Network connection restored");
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Network connection lost");
      cleanupRecognition();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial network check
    checkNetworkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupRecognition();
    };
  }, []);

  const initializeSpeechRecognition = () => {
    if (isInitializedRef.current) return true;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      toast.error("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return false;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Set to false to better handle network errors
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
        toast.info("Listening... Speak your trading command");
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        
        if (finalTranscript) {
          onResult(finalTranscript);
          setTranscript("");
          stopListening(); // Stop after getting final result
        }
      };
      
      recognitionRef.current.onerror = async (event: any) => {
        console.error('Speech recognition error:', event.error, event);
        
        if (event.error === 'network') {
          const hasConnection = await checkNetworkConnection();
          if (!hasConnection) {
            cleanupRecognition();
            toast.error("No internet connection. Please check your network and try again.");
            return;
          }
          // If we have connection but got network error, reinitialize
          cleanupRecognition();
          setTimeout(() => {
            if (isOnline) {
              startListening();
            }
          }, 1000);
        } else if (event.error === 'not-allowed') {
          cleanupRecognition();
          toast.error("Microphone access denied. Please allow microphone access to use voice commands.");
        } else if (event.error !== 'no-speech') {
          // Don't show error for no-speech as it's normal
          setError(event.error);
          toast.error("An error occurred with voice recognition. Please try again.");
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        if (!isListening) {
          cleanupRecognition();
        }
      };

      isInitializedRef.current = true;
      return true;
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError('Speech recognition initialization failed');
      toast.error("Failed to initialize voice recognition. Please try again.");
      return false;
    }
  };

  const startListening = async () => {
    if (!isOnline) {
      toast.error("No internet connection. Please check your network and try again.");
      return;
    }

    try {
      const initialized = initializeSpeechRecognition();
      if (!initialized) return;

      setIsListening(true);
      setTranscript("");
      setError(null);
      await recognitionRef.current?.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      cleanupRecognition();
      toast.error("Failed to start voice recognition. Please try again.");
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
      cleanupRecognition();
    }
  };
  
  const toggleListening = () => {
    if (isProcessing) return;
    
    try {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    } catch (err) {
      console.error('Error toggling speech recognition:', err);
      cleanupRecognition();
      toast.error("Failed to toggle voice recognition. Please try again.");
    }
  };
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleListening}
        disabled={isProcessing || !window.SpeechRecognition && !window.webkitSpeechRecognition || !isOnline}
        className={cn(
          isListening && "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800",
          error && "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800",
          !isOnline && "bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800"
        )}
        title={!isOnline ? "No internet connection" : error || "Click to use voice command"}
      >
        {isListening ? (
          <span className="relative">
            <Mic className="h-4 w-4 text-red-500" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </span>
        ) : isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !isOnline ? (
          <WifiOff className="h-4 w-4 text-gray-500" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {transcript && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-3 py-1 text-sm whitespace-nowrap">
          {transcript}
        </div>
      )}
      {!isOnline && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 border border-red-500 rounded-lg px-3 py-1 text-sm whitespace-nowrap">
          No internet connection
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
