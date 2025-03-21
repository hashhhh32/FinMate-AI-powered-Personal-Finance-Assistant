import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Send, TrendingUp, TrendingDown, AlertCircle, Plus, Mic, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Gemini API configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Hello! I'm your AI Financial Assistant powered by Google Gemini. I can help you manage your portfolio, analyze stocks, and provide financial advice. How can I help you today?",
    timestamp: new Date(),
  },
];

const quickPrompts = [
  "What stocks should I invest in?",
  "How can I reduce my expenses?",
  "Show me my portfolio performance",
  "What's the current market trend?",
  "Explain dividend investing",
];

const DashboardAssistant = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const processWithGemini = async (message: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
      console.error("Gemini API key not found in environment variables");
      throw new Error("Gemini API key is not configured");
    }

    try {
      console.log("Making request to Gemini API...");
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful financial assistant that specializes in stocks, trading, and investment advice.
                     
                     User's message: "${message}"
                     
                     Provide a helpful, accurate, and concise response. Focus on:
                     1. Answering the specific question asked
                     2. Providing actionable advice when appropriate
                     3. Including relevant market data or statistics if applicable
                     4. Explaining complex financial concepts in simple terms
                     
                     Keep your response under 150 words and maintain a professional yet friendly tone.`
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Gemini API error response:", errorData);
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log("Gemini API response:", data);

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from Gemini API");
      }

      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error("Error in processWithGemini:", error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      const aiResponse = await processWithGemini(input);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing message with Gemini:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get a response from the AI assistant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Financial Assistant</h2>
          <p className="text-muted-foreground">
            Get personalized financial advice powered by Google Gemini
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card className="flex flex-col h-[600px]">
            <CardHeader>
              <CardTitle>Chat with your AI Assistant</CardTitle>
              <CardDescription>
                Ask questions about stocks, get financial advice, or learn about investing
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <Avatar className={message.role === "user" ? "bg-primary" : "bg-muted"}>
                        <AvatarFallback>
                          {message.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3">
                      <Avatar className="bg-muted">
                        <AvatarFallback>
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex items-center w-full gap-2">
                <Input
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button variant="outline" size="icon" disabled={isLoading}>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardAssistant;
