import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyApprovalStatus } from "@/lib/approvals.functions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, ShieldAlert } from "lucide-react";

type Status = "loading" | "aprovado" | "pendente" | "rejeitado";

export function ApprovalGate({ children }: { children: React.ReactNode }) {
  const fn = useServerFn(getMyApprovalStatus);
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let mounted = true;
    fn({})
      .then((r: any) => {
        if (!mounted) return;
        setStatus(r.status as Status);
      })
      .catch(() => mounted && setStatus("pendente"));
    return () => { mounted = false; };
  }, [fn]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "aprovado") return <>{children}</>;

  const isRejected = status === "rejeitado";
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-8 text-center">
        <div className={`h-14 w-14 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isRejected ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
        }`}>
          {isRejected ? <ShieldAlert className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>
        <h1 className="text-xl font-bold mb-2">
          {isRejected ? "Acesso negado" : "Aguardando aprovação"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isRejected
            ? "Seu cadastro foi rejeitado pelo administrador. Entre em contato para mais informações."
            : "Sua conta foi criada e está aguardando a liberação do administrador. Você receberá acesso assim que for aprovado."}
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await supabase.auth.signOut();
            nav({ to: "/auth" });
          }}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </Card>
    </div>
  );
}
