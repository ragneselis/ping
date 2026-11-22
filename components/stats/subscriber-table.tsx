"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonIcon, ICON_BUTTON } from "@/components/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface SubscriberListRow {
  id: number;
  email: string;
  prefs: string;
  frequency: string;
  status: "Confirmed" | "Waiting";
  signedUp: string;
  lastSent: string;
}

/**
 * The subscriber list on /stats. Deleting asks once inline (the row's own "Delete?" with Yes and No),
 * then removes the record through /api/stats/subscribers, behind the same password.
 */
export function SubscriberTable({ rows }: { rows: SubscriberListRow[] }) {
  const router = useRouter();
  const [asking, setAsking] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: number) => {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/stats/subscribers?id=${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    setAsking(null);
    if (!res?.ok) return setError("The subscriber could not be deleted. Try again.");
    router.refresh();
  };

  if (!rows.length) return <p className="text-sm text-muted-foreground">No subscribers yet.</p>;
  return (
    <div className="grid gap-3">
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="-mx-4 overflow-x-auto md:mx-0">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-hairline-strong">
              {["Email", "Gets", "How often", "Status", "Signed up", "Last email", ""].map((h) => (
                <th key={h} scope="col" className="label-mono px-4 py-2.5 font-normal text-muted-foreground md:first:pl-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline align-top">
                <td className="px-4 py-3 font-medium whitespace-nowrap md:pl-0">{r.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.prefs}</td>
                <td className="px-4 py-3">{r.frequency}</td>
                <td className={cn("px-4 py-3", r.status === "Confirmed" ? "text-brand-sm" : "text-muted-foreground")}>{r.status}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.signedUp}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{r.lastSent}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {asking === r.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs">Delete?</span>
                      <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => remove(r.id)}>
                        {busy === r.id ? "Deleting" : "Yes"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>
                        No
                      </Button>
                    </span>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger
                        render={<button type="button" aria-label={`Delete ${r.email}`} onClick={() => setAsking(r.id)} className={cn(ICON_BUTTON, "ml-auto")} />}
                      >
                        <ButtonIcon icon={Trash2} className="size-4" strokeWidth={1.75} />
                      </TooltipTrigger>
                      <TooltipContent>Delete subscriber</TooltipContent>
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
