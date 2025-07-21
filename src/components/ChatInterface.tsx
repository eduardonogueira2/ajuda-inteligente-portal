import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface UserData {
  nome: string;
  email: string;
  solicitacao: string;
}

interface ChatInterfaceProps {
  userData: UserData;
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ userData, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // URL CORRIGIDA DO WEBHOOK
  const WEBHOOK_URL = 'https://hml-n8n.conexasaude.com.br/webhook/095f8af1-e624-4717-ba07-c22f035c1814';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChat();
  }, []);

  const saveMessageToSupabase = async (message: string, sender: 'user' | 'agent') => {
    try {
      await supabase
        .from('memory')
        .insert({
          sessionID: sessionId,
          message: `${sender}: ${message}`
        });
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
    }
  };

  const initializeChat = async () => {
    setIsLoading(true);
    
    const welcomeMessage: Message = {
      id: `msg_${Date.now()}`,
      content: `Olá ${userData.nome}! Recebi sua solicitação e estou aqui para ajudá-lo. Como posso auxiliá-lo hoje?`,
      sender: 'agent',
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    await saveMessageToSupabase(welcomeMessage.content, 'agent');

    try {
      // ESTRUTURA DE DADOS CORRIGIDA
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        // REMOVIDO mode: 'no-cors' para permitir cabeçalhos corretos
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          chatInput: `Inicialização do chat. Dados do usuário: Nome: ${userData.nome}, Email: ${userData.email}, Solicitação: ${userData.solicitacao}`,
          userData,
          action: 'initialize_chat'
        }),
      });

      // TRATAMENTO DA RESPOSTA DO WEBHOOK
      if (response.ok) {
        const responseData = await response.json();
        if (responseData && responseData.output) {
          const agentResponse: Message = {
            id: `msg_${Date.now() + 1}`,
            content: responseData.output,
            sender: 'agent',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, agentResponse]);
          await saveMessageToSupabase(agentResponse.content, 'agent');
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar chat:', error);
      toast({
        title: "Aviso",
        description: "Conexão com o agente pode estar instável, mas você pode continuar conversando.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessageToSupabase(inputMessage, 'user');
    
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // ESTRUTURA DE DADOS CORRIGIDA
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          chatInput: messageToSend, // CAMPO CORRIGIDO: chatInput em vez de message
          userData,
          action: 'send_message'
        }),
      });

      // TRATAMENTO DA RESPOSTA DO WEBHOOK
      if (response.ok) {
        const responseData = await response.json();
        if (responseData && responseData.output) {
          const agentResponse: Message = {
            id: `msg_${Date.now() + 1}`,
            content: responseData.output,
            sender: 'agent',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, agentResponse]);
          await saveMessageToSupabase(agentResponse.content, 'agent');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // FALLBACK: Resposta simulada em caso de erro
      const fallbackResponse: Message = {
        id: `msg_${Date.now() + 1}`,
        content: "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.",
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
      await saveMessageToSupabase(fallbackResponse.content, 'agent');
      
      toast({
        title: "Erro de Conexão",
        description: "Falha ao enviar mensagem. Resposta simulada fornecida.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-3 max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 bg-gradient-primary rounded-full">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Agente de IA - Suporte</h1>
            <p className="text-sm text-muted-foreground">
              Conectado • {userData.nome}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[70%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`p-2 rounded-full ${
                    message.sender === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className={`text-xs mt-1 block ${
                      message.sender === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card border border-border p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;