"use client";

import { BellRing, Mail, MessageSquare } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** "Get new jobs" call to action. Placeholder until email and Slack updates exist. */
export function SubscribeDialog({ trigger }: { trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <BellRing className="size-5" />
          </div>
          <DialogTitle className="text-xl">Coming soon: email and Slack updates</DialogTitle>
          <DialogDescription>
            We are building a way to ping you when new jobs land that match your direction. No spam, no daily digest of
            senior roles you cannot apply for yet. Until then, check back here: the list refreshes regularly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Mail className="size-4 text-primary" />
            <span>A weekly email with new roles in your categories</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <MessageSquare className="size-4 text-primary" />
            <span>A Slack channel for the EKA design crowd</span>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button>Sounds good</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
