import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Band } from "@/components/blueprint";
import { Button } from "@/components/ui/button";

/** Where the confirm and unsubscribe links in Ping's emails land. */
const STATES = {
  confirmed: {
    title: "You're in",
    body: "Your email is confirmed. When Ping finds new jobs that match what you picked, they come to your inbox, at most 10 per email. No new finds, no email.",
    note: "Every email has a link to change what you get and a link to unsubscribe.",
  },
  removed: {
    title: "You are unsubscribed",
    body: "Your address and preferences are deleted. Ping will not email you again.",
    note: "Changed your mind? Sign up again any time with Get new jobs.",
  },
  invalid: {
    title: "This link has expired",
    body: "The link is not valid any more. The address may already be confirmed, or it was unsubscribed.",
    note: "To sign up again, use Get new jobs at the top of the page.",
  },
} as const;

type State = keyof typeof STATES;

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  return { title: STATES[state as State]?.title ?? "Email", robots: { index: false } };
}

export default async function SubscriptionPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const s = STATES[state as State];
  if (!s) notFound();
  return (
    <Band aria-labelledby="state-heading" inner="grid gap-5 py-16 sm:py-24">
      <h1 id="state-heading">{s.title}</h1>
      <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">{s.body}</p>
      <p className="max-w-prose text-sm text-muted-foreground">{s.note}</p>
      <div className="pt-2">
        <Button nativeButton={false} render={<Link href="/" />}>
          See the jobs
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </Band>
  );
}
