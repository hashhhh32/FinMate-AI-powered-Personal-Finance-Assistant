
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Send, TrendingUp, TrendingDown, AlertCircle, Plus, Mic, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface StockInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Hello! I'm your AI Financial Assistant. I can help you manage your portfolio, analyze stocks, and provide financial advice. How can I help you today?",
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
  const [showStockInfo, setShowStockInfo] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sample stocks data (in a real app, this would come from an API)
  const stocks = [
    { symbol: "AAPL", name: "Apple Inc.", price: 174.82, change: 1.45, changePercent: 0.84 },
    { symbol: "MSFT", name: "Microsoft Corp.", price: 328.79, change: 2.16, changePercent: 0.66 },
    { symbol: "AMZN", name: "Amazon.com Inc.", price: 132.65, change: -0.54, changePercent: -0.41 },
    { symbol: "GOOGL", name: "Alphabet Inc.", price: 137.12, change: 0.78, changePercent: 0.57 },
    { symbol: "META", name: "Meta Platforms Inc.", price: 332.41, change: 3.25, changePercent: 0.99 },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      // Check if message contains stock symbols
      const hasStockSymbol = /\b(AAPL|MSFT|AMZN|GOOGL|META|SPY|QQQ)\b/i.test(input);
      
      // Simulate different responses based on input content
      let responseContent = "";
      
      if (input.toLowerCase().includes("buy") || input.toLowerCase().includes("sell")) {
        const stockMatch = input.match(/\b(AAPL|MSFT|AMZN|GOOGL|META)\b/i);
        if (stockMatch) {
          const stockSymbol = stockMatch[0].toUpperCase();
          const stock = stocks.find(s => s.symbol === stockSymbol);
          
          if (stock) {
            setSelectedStock(stock);
            setShowStockInfo(true);
            
            if (input.toLowerCase().includes("buy")) {
              responseContent = `I've analyzed ${stock.name} (${stock.symbol}) for you. The current price is $${stock.price}. Based on market trends and your portfolio, this could be a good addition. Would you like to proceed with buying shares?`;
            } else {
              responseContent = `I've analyzed your position in ${stock.name} (${stock.symbol}). The current price is $${stock.price}. Would you like to proceed with selling your shares?`;
            }
          } else {
            responseContent = `I couldn't find information for the stock you mentioned. Could you please try again with a valid stock symbol?`;
          }
        } else {
          responseContent = `I can help you buy or sell stocks. Could you please specify which stock you're interested in by using its symbol (e.g., AAPL, MSFT)?`;
        }
      } else if (hasStockSymbol) {
        const stockMatch = input.match(/\b(AAPL|MSFT|AMZN|GOOGL|META)\b/i);
        if (stockMatch) {
          const stockSymbol = stockMatch[0].toUpperCase();
          const stock = stocks.find(s => s.symbol === stockSymbol);
          
          if (stock) {
            setSelectedStock(stock);
            setShowStockInfo(true);
            responseContent = `Here's the current information for ${stock.name} (${stock.symbol}): The price is $${stock.price}, with a change of ${stock.change > 0 ? '+' : ''}${stock.change} (${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%) today. Based on current market analysis, this stock has moderate growth potential with medium volatility.`;
          }
        }
      } else if (input.toLowerCase().includes("portfolio")) {
        responseContent = "Your portfolio is currently valued at $85,234.78, up 3.2% this month. Your top performers are NVDA (+12.3%) and MSFT (+5.8%), while TSLA (-4.1%) is underperforming. Would you like me to suggest some portfolio optimizations?";
      } else if (input.toLowerCase().includes("market") || input.toLowerCase().includes("trend")) {
        responseContent = "The market is currently showing a bullish trend. The S&P 500 is up 0.8% today, with technology and healthcare sectors leading the gains. Would you like more specific information about any particular sector?";
      } else if (input.toLowerCase().includes("dividend")) {
        responseContent = "Dividend investing involves buying stocks that regularly distribute a portion of their earnings to shareholders. Some top dividend stocks include JNJ (yield: 2.8%), PG (yield: 2.4%), and KO (yield: 3.1%). Would you like me to recommend some dividend stocks for your portfolio?";
      } else if (input.toLowerCase().includes("expense") || input.toLowerCase().includes("spending")) {
        responseContent = "Based on your recent spending patterns, I've noticed that your restaurant expenses have increased by 18% compared to last month. Consider setting a budget limit for dining out to better manage your expenses. Would you like me to help you set up a budget plan?";
      } else {
        responseContent = "Thank you for your question. I'd be happy to help you with that. Could you provide more specific details so I can give you the most accurate information?";
      }
      
      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleExecuteTrade = () => {
    if (!selectedStock) return;
    
    toast({
      title: "Trade Executed",
      description: `You've successfully purchased shares of ${selectedStock.symbol} at $${selectedStock.price}.`,
    });
    
    setShowStockInfo(false);
    setSelectedStock(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Financial Assistant</h2>
          <p className="text-muted-foreground">
            Get personalized financial advice and manage your investments
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card className="flex flex-col h-[600px]">
            <CardHeader>
              <CardTitle>Chat with your AI Assistant</CardTitle>
              <CardDescription>
                Ask questions about stocks, get financial advice, or execute trades
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
                />
                <Button variant="outline" size="icon">
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
                >
                  {prompt}
                </Button>
              ))}
            </CardContent>
          </Card>
          
          {showStockInfo && selectedStock && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{selectedStock.name}</CardTitle>
                <CardDescription>{selectedStock.symbol}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold">${selectedStock.price}</div>
                <div className={`flex items-center ${
                  selectedStock.change >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {selectedStock.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  <span>
                    {selectedStock.change >= 0 ? "+" : ""}
                    {selectedStock.change} ({selectedStock.change >= 0 ? "+" : ""}
                    {selectedStock.changePercent}%)
                  </span>
                </div>
                <Button onClick={handleExecuteTrade} className="w-full">
                  Buy {selectedStock.symbol}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAssistant;
