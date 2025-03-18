
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceInputProps {
  onResult: (transcript: string) => void;
  isProcessing: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onresult = (event) => {
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
      
      setTranscript(finalTranscript || interimTranscript);
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'no-speech') {
        toast({
          title: "No speech detected",
          description: "Please try speaking again or use text input",
          variant: "destructive"
        });
      }
      stopRecording();
    };
    
    recognitionRef.current.onend = () => {
      // This ensures we only call onResult if we have content and were recording
      if (isRecording && transcript) {
        onResult(transcript);
      }
      setIsRecording(false);
    };
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update effect to handle transcript changes
  useEffect(() => {
    if (!isRecording && transcript) {
      // If we have a transcript but aren't recording anymore, clear it
      // This prevents duplicate submissions
      setTranscript("");
    }
  }, [isRecording, transcript]);

  const startRecording = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
        setTranscript("");
        
        toast({
          title: "Listening...",
          description: "Speak your trading command or question"
        });
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice commands",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // The onend handler will set isRecording to false and call onResult
    }
  };

  return (
    <div className="flex items-center justify-center">
      {isRecording ? (
        <Button
          onClick={stopRecording}
          variant="destructive"
          size="icon"
          className="rounded-full w-12 h-12"
          disabled={isProcessing}
        >
          <Square className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          onClick={startRecording}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 border-primary"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      )}
      {transcript && isRecording && (
        <div className="ml-4 text-sm text-muted-foreground max-w-[300px] truncate">
          "{transcript}"
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
