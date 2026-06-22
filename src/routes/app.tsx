import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ApprovalGate } from "@/components/ApprovalGate";

export const Route = createFileRoute("/app")({
  component: () => (
    <ApprovalGate>
      <AppShell />
    </ApprovalGate>
  ),
});
