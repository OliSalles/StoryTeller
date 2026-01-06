import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Loader2, Sparkles, GitBranch, Zap, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/generate");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-12">
        <div className="text-center space-y-6">
          <motion.div
            className="inline-flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8, rotateY: -180 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img src="/logo.png" alt="Story Teller" className="w-60 h-60" />
          </motion.div>

          <p className="text-xl text-foreground/70 max-w-2xl mx-auto leading-relaxed">
            Transforme ideias em épicas histórias de usuário. Conte histórias
            que geram valor, nossa IA cria features completas com critérios de
            aceite e exporta para Jira.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 w-fit">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Geração com IA</h3>
            <p className="text-foreground/70 leading-relaxed">
              Descreva sua feature e deixe a IA criar histórias de usuário
              detalhadas com critérios de aceite
            </p>
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 w-fit">
              <GitBranch className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Integração com Boards</h3>
            <p className="text-foreground/70 leading-relaxed">
              Exporte features e histórias diretamente para seu projeto Jira ou
              Azure com um clique
            </p>
          </GlassCard>

          <GlassCard className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 w-fit">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Produtividade</h3>
            <p className="text-foreground/70 leading-relaxed">
              Economize horas de trabalho manual na criação e organização de
              requisitos
            </p>
          </GlassCard>
        </div>

        <GlassCard className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center">Como Funciona</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">
                  Configure suas integrações
                </h4>
                <p className="text-foreground/70 text-sm">
                  Conecte seu LLM preferido e sua conta Jira
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Descreva sua feature</h4>
                <p className="text-foreground/70 text-sm">
                  Explique o que você precisa em linguagem natural
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Revise e exporte</h4>
                <p className="text-foreground/70 text-sm">
                  A IA gera tudo automaticamente. Revise e exporte para PDF ou
                  integre com Jira ou Azure DevOps
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={() => setLocation("/login")}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Começar Agora
          </Button>
        </div>

        <footer className="text-center text-sm text-foreground/50 py-6">
          Desenvolvido por Lucas Salles
        </footer>
      </div>
    </div>
  );
}
