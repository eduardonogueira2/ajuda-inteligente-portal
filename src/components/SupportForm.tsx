import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Bot, MessageCircle, Send, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from './ChatInterface';

interface FormData {
  nome: string;
  email: string;
  solicitacao: string;
}

const SupportForm = () => {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    solicitacao: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail deve ter um formato válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpa o erro do campo quando o usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Erro na validação",
        description: "Por favor, preencha todos os campos obrigatórios corretamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Dados do formulário:', formData);
      
      toast({
        title: "Conectando...",
        description: "Iniciando conversa com o agente de IA.",
      });

      // Abrir interface de chat
      setShowChat(true);
      
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.nome.trim() && formData.email.trim();

  if (showChat) {
    return (
      <ChatInterface 
        userData={formData} 
        onBack={() => setShowChat(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-soft border-0">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-gradient-primary rounded-full shadow-glow">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Suporte Inteligente
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Conecte-se com nosso agente de IA para obter ajuda personalizada
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                  Nome *
                </Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className={`transition-all duration-200 ${
                    errors.nome 
                      ? 'border-destructive focus:border-destructive' 
                      : 'focus:border-primary'
                  }`}
                />
                {errors.nome && (
                  <div className="flex items-center space-x-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.nome}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`transition-all duration-200 ${
                    errors.email 
                      ? 'border-destructive focus:border-destructive' 
                      : 'focus:border-primary'
                  }`}
                />
                {errors.email && (
                  <div className="flex items-center space-x-1 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="solicitacao" className="text-sm font-medium text-foreground">
                  Descreva a sua solicitação
                </Label>
                <Textarea
                  id="solicitacao"
                  placeholder="Descreva detalhadamente sua necessidade ou dúvida..."
                  value={formData.solicitacao}
                  onChange={(e) => handleInputChange('solicitacao', e.target.value)}
                  className="min-h-[100px] resize-none focus:border-primary transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional: Forneça o máximo de detalhes possível para um atendimento mais eficaz
                </p>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Iniciar Atendimento
                  </>
                )}
              </Button>

              {!isFormValid && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Preencha nome e e-mail para continuar</span>
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Ao usar nosso serviço, você concorda com nossos termos de uso e política de privacidade
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportForm;