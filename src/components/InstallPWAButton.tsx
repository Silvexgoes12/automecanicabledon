import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else if (isIOS) {
      setShowIOSHint((v) => !v);
    } else {
      setShowIOSHint((v) => !v);
    }
  };

  if (!deferred && !isIOS) {
    // Desktop / browser sem suporte ainda — mostra ajuda manual
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={handleClick} className="gap-2">
        <Download className="h-4 w-4" /> Instalar app
      </Button>
      {showIOSHint && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md z-50">
          {isIOS ? (
            <>
              No iPhone/iPad: toque em <strong>Compartilhar</strong> e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </>
          ) : (
            <>
              No menu do navegador, escolha <strong>Instalar app</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>.
            </>
          )}
        </div>
      )}
    </div>
  );
}
