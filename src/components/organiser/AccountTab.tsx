import type { OrgCtx } from "./OrganiserApp";

export function AccountTab({ ctx }: { ctx: OrgCtx }) {
  return (
    <p className="py-10 text-center text-[16px] text-muted-foreground">
      This section isn’t finished yet. {ctx.events.length} saved event(s) in your workspace.
    </p>
  );
}
