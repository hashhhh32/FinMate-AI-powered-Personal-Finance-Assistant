
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User, Send, DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTrading } from "@/hooks/use-trading";
import VoiceInput from "./VoiceInput";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TradingAssistantProps {
  initialPrompt?: string;
}

const TradingAssistant: React.FC<TradingAssistantProps> = ({ initialPrompt }) => {
  const { toast } = useToast();
  const { sendMessage, conversations, isProcessing, portfolio, recentOrders } = useTrading();
  const [input, setInput] = useState(initialPrompt || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  // If there's an initial prompt, send it once
  useEffect(() => {
    if (initialPrompt && conversations.length === 0) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (message: string = input) => {
    if (!message.trim()) return;
    
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return;
    
    await sendMessage(transcript, 'voice');
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <Card className="flex flex-col flex-1">
        <CardHeader>
          <CardTitle>Trading Assistant</CardTitle>
          <CardDescription>
            Ask questions, get market data, or execute trades with text or voice commands
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">
                  Your trading assistant is ready. Try asking about stocks or placing a trade.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <Badge className="cursor-pointer" variant="outline" onClick={() => setInput("Buy 5 shares of AAPL")}>
                    Buy 5 shares of AAPL
                  </Badge>
                  <Badge className="cursor-pointer" variant="outline" onClick={() => setInput("What's the price of TSLA?")}>
                    What's TSLA's price?
                  </Badge>
                  <Badge className="cursor-pointer" variant="outline" onClick={() => setInput("Show my portfolio")}>
                    Show my portfolio
                  </Badge>
                </div>
              </div>
            ) : (
              conversations.map((message, index) => (
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
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <Avatar className="bg-muted">
                    <AvatarFallback>
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Processing...</span>
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
              placeholder="Ask a question or give a trading command..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={isProcessing}
            />
            <VoiceInput onResult={handleVoiceInput} isProcessing={isProcessing} />
            <Button onClick={() => handleSendMessage()} disabled={isProcessing || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {portfolio && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Equity:</span>
                <span className="font-medium">${portfolio.equity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Balance:</span>
                <span className="font-medium">${portfolio.cash.toFixed(2)}</span>
              </div>
              
              {portfolio.positions.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Positions</h4>
                  <div className="divide-y">
                    {portfolio.positions.slice(0, 3).map((position) => (
                      <div key={position.symbol} className="py-2 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{position.symbol}</div>
                          <div className="text-xs text-muted-foreground">{position.quantity} shares</div>
                        </div>
                        <div className="text-right">
                          <div>${position.market_value.toFixed(2)}</div>
                          <div className={`text-xs flex items-center ${
                            position.unrealized_pl >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {position.unrealized_pl >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {position.unrealized_pl >= 0 ? '+' : ''}
                            ${position.unrealized_pl.toFixed(2)} ({position.unrealized_pl >= 0 ? '+' : ''}
                            {position.unrealized_plpc.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {portfolio.positions.length > 3 && (
                    <div className="text-center text-xs text-muted-foreground mt-2">
                      + {portfolio.positions.length - 3} more positions
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-2">
                  No positions in your portfolio yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {recentOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex justify-between items-center py-1">
                  <div className="flex items-center">
                    <Badge variant={order.order_type === 'buy' ? 'default' : 'destructive'} className="mr-2">
                      {order.order_type === 'buy' ? 'BUY' : 'SELL'}
                    </Badge>
                    <div>
                      <div className="font-medium">{order.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{order.quantity} shares</div>
                    <div className="text-xs text-muted-foreground">
                      {order.status}
                      {order.price && ` @ $${order.price.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TradingAssistant;
