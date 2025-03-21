import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, RefreshCw } from "lucide-react";
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
  const recognitionRef = useRef<any>(null);
  const maxRetries = 3;

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      toast.error("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return false;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
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
          recognitionRef.current?.stop();
          onResult(finalTranscript);
          setRetryCount(0); // Reset retry count on successful recognition
        }
      };
      
      recognitionRef.current.onerror = async (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
        
        switch (event.error) {
          case 'not-allowed':
            toast.error("Microphone access denied. Please allow microphone access to use voice commands.");
            break;
          case 'no-speech':
            toast.error("No speech was detected. Please try again.");
            break;
          case 'network':
            if (retryCount < maxRetries) {
              setIsRetrying(true);
              toast.info(`Network error. Retrying... (Attempt ${retryCount + 1}/${maxRetries})`);
              // Wait for 2 seconds before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
              setRetryCount(prev => prev + 1);
              startListening();
            } else {
              toast.error("Network error persists. Please check your connection and try again later.");
              setRetryCount(0);
            }
            break;
          default:
            toast.error("An error occurred with voice recognition. Please try again.");
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (!error && transcript.trim() && !isRetrying) {
          onResult(transcript);
          setTranscript("");
        }
      };

      return true;
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError('Speech recognition initialization failed');
      toast.error("Failed to initialize voice recognition. Please try again.");
      return false;
    }
  };

  useEffect(() => {
    const success = initializeSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping speech recognition:', err);
        }
      }
    };
  }, []);

  const startListening = () => {
    try {
      setTranscript("");
      setError(null);
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      toast.error("Failed to start voice recognition. Please try again.");
    }
  };
  
  const toggleListening = () => {
    if (isProcessing) return;
    
    try {
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        startListening();
      }
    } catch (err) {
      console.error('Error toggling speech recognition:', err);
      toast.error("Failed to start voice recognition. Please try again.");
    }
  };
  
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleListening}
        disabled={isProcessing || !window.SpeechRecognition && !window.webkitSpeechRecognition}
        className={cn(
          isListening && "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800",
          error && "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800"
        )}
        title={error || "Click to use voice command"}
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
        ) : isRetrying ? (
          <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {transcript && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-3 py-1 text-sm whitespace-nowrap">
          {transcript}
        </div>
      )}
      {isRetrying && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-500 rounded-lg px-3 py-1 text-sm whitespace-nowrap">
          Retrying... Attempt {retryCount}/{maxRetries}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
