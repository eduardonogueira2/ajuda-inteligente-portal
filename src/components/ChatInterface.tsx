import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Bot, User, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // URL do webhook N8N
  const WEBHOOK_URL = 'https://hml-n8n.conexasaude.com.br/webhook/formulario-lovable';

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
      // Nota: Para usar Supabase, conecte a integração nativa do Lovable
      console.log('Salvando mensagem:', { sessionId, message: `${sender}: ${message}` });
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
    }
  };

  const initializeChat = async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');

    const welcomeMessage: Message = {
      id: `msg_${Date.now()}`,
      content: "Olá! Sou seu assistente de IA. Como posso ajudá-lo hoje?",
      sender: 'agent',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    await saveMessageToSupabase(welcomeMessage.content, 'agent');

    try {
      const webhookData = {
        sessionId: sessionId,
        action: 'initialize_chat',
        timestamp: new Date().toISOString(),
        usuario: {
          nome: userData.nome,
          email: userData.email,
          solicitacao: userData.solicitacao
        },
        mensagem: {
          tipo: 'inicializacao',
          conteudo: `Inicialização do chat. Dados do usuário: Nome: ${userData.nome}, Email: ${userData.email}, Solicitação: ${userData.solicitacao}`
        }
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Verifica se há uma resposta do agente
        if (responseData && responseData.message) {
          const agentResponse: Message = {
            id: `msg_${Date.now() + 1}`,
            content: responseData.message.value || responseData.message,
            sender: 'agent',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, agentResponse]);
          await saveMessageToSupabase(agentResponse.content, 'agent');
        }
        
        setConnectionStatus('connected');
        toast({
          title: "Chat Inicializado",
          description: "Conectado com sucesso ao agente de IA.",
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro ao inicializar chat:', error);
      setConnectionStatus('disconnected');
      
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao agente. Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    await saveMessageToSupabase(messageToSend, 'user');
    setIsLoading(true);

    try {
      const webhookData = {
        sessionId: sessionId,
        action: 'send_message',
        timestamp: new Date().toISOString(),
        usuario: {
          nome: userData.nome,
          email: userData.email,
          solicitacao: userData.solicitacao
        },
        mensagem: {
          tipo: 'usuario',
          conteudo: messageToSend
        }
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Verifica se há uma resposta do agente
        if (responseData && responseData.message) {
          const agentResponse: Message = {
            id: `msg_${Date.now() + 1}`,
            content: responseData.message.value || responseData.message,
            sender: 'agent',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, agentResponse]);
          await saveMessageToSupabase(agentResponse.content, 'agent');
        }
        
        setConnectionStatus('connected');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setConnectionStatus('disconnected');

      const fallbackResponse: Message = {
        id: `msg_${Date.now() + 1}`,
        content: "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.",
        sender: 'agent',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fallbackResponse]);
      await saveMessageToSupabase(fallbackResponse.content, 'agent');

      toast({
        title: "Erro ao Enviar",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive"
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

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 backdrop-blur-sm bg-opacity-95 sticky top-0 z-10">
        <div className="flex items-center space-x-3 max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="p-2 hover:bg-muted transition-smooth"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 bg-gradient-primary rounded-full">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Agente de IA - Suporte</h1>
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <p className="text-sm text-muted-foreground">
                {connectionStatus === 'connected' && `Conectado • ${userData.nome}`}
                {connectionStatus === 'disconnected' && 'Desconectado'}
                {connectionStatus === 'connecting' && 'Conectando...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`flex items-start space-x-3 max-w-[70%] ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`p-2 rounded-full transition-smooth ${
                  message.sender === 'user' 
                    ? 'bg-gradient-primary text-primary-foreground shadow-lg' 
                    : 'bg-muted border border-border'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`p-3 rounded-lg transition-smooth ${
                  message.sender === 'user'
                    ? 'bg-chat-user-bg text-chat-user-fg shadow-lg'
                    : 'bg-chat-agent-bg text-chat-agent-fg border border-border'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <span className={`text-xs mt-2 block opacity-70`}>
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
                <div className="p-2 rounded-full bg-muted border border-border">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-chat-agent-bg text-chat-agent-fg border border-border p-3 rounded-lg">
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
        <div className="border-t border-border p-4 bg-card backdrop-blur-sm bg-opacity-95">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 transition-smooth"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
              className="transition-smooth"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

