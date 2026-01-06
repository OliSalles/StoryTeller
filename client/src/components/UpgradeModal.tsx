import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  limitType?: "tokens" | "features" | "export";
}

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  title,
  description,
  limitType = "tokens"
}: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  const defaultTitles = {
    tokens: "Limite de Tokens Atingido! 🚀",
    features: "Limite de Features Atingido! 🚀",
    export: "Exportação Bloqueada! 🚀"
  };

  const defaultDescriptions = {
    tokens: "Você atingiu o limite de tokens do plano gratuito. Faça upgrade para o plano Pro e tenha 500.000 tokens por mês!",
    features: "Você atingiu o limite de features do plano gratuito. Faça upgrade para o plano Pro e tenha features ilimitadas!",
    export: "A exportação para Jira e Azure DevOps está disponível apenas nos planos Pro e Business."
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {title || defaultTitles[limitType]}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {description || defaultDescriptions[limitType]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="font-semibold text-sm text-foreground">
            Com o Plano Pro você terá:
          </p>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">Features ilimitadas</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">500.000 tokens por mês (10x mais)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">Exportação para Jira e Azure DevOps</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">PDF sem marca d'água</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">Suporte por email</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">7 dias de trial grátis</span>
            </div>
          </div>

          <div className="bg-primary/5 p-3 rounded-lg mt-4">
            <p className="text-sm font-semibold text-primary mb-1">
              🎉 Oferta Especial
            </p>
            <p className="text-xs text-muted-foreground">
              Plano Anual: Economize 2 meses pagando apenas R$ 490/ano
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
          <Button
            onClick={handleUpgrade}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Ver Planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


