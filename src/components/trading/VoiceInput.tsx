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
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const recognitionRef = useRef<any>(null);
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  // Check network connectivity
  const checkNetworkConnection = async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    setIsOnline(true);
    return true;
  };

  useEffect(() => {
    // Add network status event listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connection restored");
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Network connection lost");
      stopListening();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial network check
    checkNetworkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopListening();
    };
  }, []);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      toast.error("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return false;
    }

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Keep listening until manually stopped
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
          setError(null);
          setIsRetrying(false);
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
          }
        };
        
        recognitionRef.current.onerror = async (event: any) => {
          console.error('Speech recognition error:', event.error, event);
          
          if (event.error === 'network') {
            const hasConnection = await checkNetworkConnection();
            if (!hasConnection) {
              stopListening();
              toast.error("No internet connection. Please check your network and try again.");
              return;
            }
          } else if (event.error === 'not-allowed') {
            stopListening();
            toast.error("Microphone access denied. Please allow microphone access to use voice commands.");
            return;
          }
          
          // Don't set error for no-speech as it's normal when user stops talking
          if (event.error !== 'no-speech') {
            setError(event.error);
          }
        };
        
        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          // Only set isListening to false if we're not supposed to be listening
          // This prevents the mic from turning off when there's just a pause in speech
          if (!isListening) {
            setIsListening(false);
          } else {
            // If we're supposed to be listening but recognition ended, restart it
            try {
              recognitionRef.current?.start();
            } catch (err) {
              console.error('Error restarting speech recognition:', err);
              setIsListening(false);
            }
          }
        };
      }

      return true;
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError('Speech recognition initialization failed');
      toast.error("Failed to initialize voice recognition. Please try again.");
      return false;
    }
  };

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    if (!isOnline) {
      toast.error("No internet connection. Please check your network and try again.");
      return;
    }

    try {
      if (!recognitionRef.current) {
        const initialized = initializeSpeechRecognition();
        if (!initialized) return;
      }

      setIsListening(true);
      setTranscript("");
      setError(null);
      await recognitionRef.current?.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      toast.error("Failed to start voice recognition. Please try again.");
    }
  };

  const stopListening = () => {
    try {
      setIsListening(false);
      recognitionRef.current?.stop();
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
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
      setIsListening(false);
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
