"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Copy,
  MoreVertical,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { chunkId: string; documentName: string; score: number }[];
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm NexusAI. I can answer questions about your connected data sources. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Based on your knowledge base, I found relevant information about that topic. The key points are: 1) Your company uses a multi-cloud strategy... 2) The quarterly goals include expanding into new markets... 3) The technical architecture follows microservices patterns...",
        citations: [
          { chunkId: "1", documentName: "Q4 Strategy.pdf", score: 0.92 },
          { chunkId: "2", documentName: "Architecture Overview.docx", score: 0.87 },
        ],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <Card className="w-80 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Data Sources</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${source.active ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-sm">{source.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {source.chunks}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">NexusAI Assistant</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by GPT-4 + RAG</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <RefreshCw className="mr-2 h-4 w-4" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.citations.map((citation, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs bg-background/50 rounded p-1.5"
                          >
                            <span>{citation.documentName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(citation.score * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="flex-shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Ask a question about your data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            NexusAI may produce inaccurate information. Always verify important outputs.
          </p>
        </div>
      </Card>

      <Card className="w-64 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Model Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">AI Model</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full mt-1" size="sm">
                  GPT-4
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>GPT-4</DropdownMenuItem>
                <DropdownMenuItem>GPT-3.5 Turbo</DropdownMenuItem>
                <DropdownMenuItem>Claude 3</DropdownMenuItem>
                <DropdownMenuItem>Gemini Pro</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="text-sm font-medium">Temperature</label>
            <div className="mt-1 text-xs text-muted-foreground">0.7</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.7"
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Max Tokens</label>
            <div className="mt-1 text-xs text-muted-foreground">2048</div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              defaultValue="2048"
              className="w-full mt-1"
            />
          </div>
          <div className="pt-4 border-t">
            <label className="text-sm font-medium">Session Stats</label>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages</span>
                <span>{messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tokens</span>
                <span>~2,456</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const sources = [
  { id: "1", name: "Company Knowledge Base", chunks: 1234, active: true },
  { id: "2", name: "Product Documentation", chunks: 567, active: true },
  { id: "3", name: "Customer Support", chunks: 890, active: true },
  { id: "4", name: "Sales Documents", chunks: 234, active: false },
];
