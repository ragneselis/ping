"use client";

import { Check, Mail, MailCheck } from "lucide-react";
import { DiscordIcon, SlackIcon } from "@/components/brand-icons";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactElement, type Ref } from "react";
import { CategoryDot } from "@/components/category";
import { DataLabel, Segmented } from "@/components/filter-controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORY_META } from "@/lib/categories";
import { track } from "@/components/usage-beacon";
import { OWN_CLICK_SOUND, sound } from "@/lib/sound";
import { DIGEST_CAP, EMPTY_PREFS, type Frequency, isEmail, type Prefs, prefsFromQuery, toFrequency } from "@/lib/subscription";
import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconText } from "@/components/icon-text";

/*
 * "Get new jobs": the email subscription modal.
 * - Sign up: opens pre-filled from the Jobs page filters in the URL; everything stays editable.
 *   Double opt-in: the server sends a confirmation link and nothing else until it is clicked.
 * - Manage: the "Change what you get" link in every email opens /?manage=<token>; the modal opens
 *   by itself with the saved preferences and saves changes to that subscription.
 * One instance lives in the header, so the manage link opens exactly one dialog.
 */

const LEVEL_ITEMS = [
  { value: "any", label: "Any" },
  { value: "reach", label: "Within reach" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];
const LOCATION_ITEMS = [
  { value: "any", label: "Anywhere" },
  { value: "1", label: "Open to Estonia" },
];
const REMOTE_ITEMS = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];
const FREQUENCY_ITEMS = [
  { value: "weekly", label: "Monday" },
  { value: "twice", label: "Monday and Thursday" },
];

type Mode = { kind: "signup" } | { kind: "manage"; token: string; email: string };

/** Sections the modal can open at. */
export type SubscribeSection = "channels";
const OPEN_EVENT = "ping:open-subscribe";

/**
 * Open the "Get new jobs" modal from anywhere (the Slack and Discord buttons, the phone menu),
 * optionally scrolled to a section. The one dialog instance in the header listens for it.
 */
export function openSubscribe(section?: SubscribeSection) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { section } }));
}

const CHANNELS_ID = "subscribe-channels";
type Status = "idle" | "sending" | "sent" | "saved" | "error";

/** Square checkbox in Ping's style: hairline box, solid emerald when ticked, 44px row on phones. */
function DirectionCheckbox({ category, checked, onChange }: { category: Category | "all"; checked: boolean; onChange: () => void }) {
  return (
    <label
      data-sound="click"
      className="group flex min-h-11 cursor-pointer items-center border-b border-hairline text-sm select-none sm:min-h-9"
    >
      {/* The box is a glyph next to the text: IconText centres it on the label's capitals. Its slot holds a
          real checkbox, so it stays visible to assistive tech. */}
      <IconText
        className="gap-3"
        iconsHidden={false}
        icon={
      <span className="relative flex size-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer size-4 cursor-pointer appearance-none border border-hairline-strong bg-card transition-colors checked:border-primary checked:bg-primary group-hover:border-brand-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute inset-0.5 size-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
      </span>
        }
      >
        {category === "all" ? (
          <span className="font-medium">All directions</span>
        ) : (
          <IconText inline icon={<CategoryDot category={category} />}>
            {CATEGORY_META[category].short}
          </IconText>
        )}
      </IconText>
    </label>
  );
}

const CHANNELS = [
  { value: "email", label: "Email", icon: Mail, soon: false },
  { value: "slack", label: "Slack", icon: SlackIcon, soon: true },
  { value: "discord", label: "Discord", icon: DiscordIcon, soon: true },
] as const;

/**
 * "Where to get them": Email is the working channel and stays selected; Slack and Discord are shown
 * with a "Coming soon" badge and cannot be picked yet. A radio group, so it reads as one choice.
 */
function ChannelPicker({ emailRef }: { emailRef?: Ref<HTMLInputElement> }) {
  const id = useId();
  return (
    <fieldset id={CHANNELS_ID} className="grid scroll-mt-6 gap-1.5">
      <legend className="mb-1.5">
        <DataLabel id={id}>Where to get them</DataLabel>
      </legend>
      <div className="grid gap-x-2 gap-y-3 pt-1 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <label
            key={c.value}
            className={cn(
              "relative flex min-h-11 items-center gap-2.5 border px-3 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring sm:min-h-12",
              c.soon ? "cursor-not-allowed border-hairline text-muted-foreground" : "border-brand-lg bg-brand-tint font-medium text-foreground",
            )}
          >
            <input
              ref={c.soon ? undefined : emailRef}
              type="radio"
              name={`${id}-channel`}
              value={c.value}
              defaultChecked={!c.soon}
              disabled={c.soon}
              aria-describedby={c.soon ? `${id}-${c.value}-soon` : undefined}
              className="sr-only"
            />
            <IconText
              className="flex-1 gap-2.5"
              textClassName="flex-1"
              icon={<c.icon className={c.soon ? "size-3.5" : "size-4"} strokeWidth={1.75} />}
              iconEnd={!c.soon && <Check strokeWidth={2.25} className="size-4 text-brand-sm" />}
            >
              {c.label}
            </IconText>
            {c.soon ? (
              // Sits on the card's top edge, so the card keeps one line at every width.
              <span
                id={`${id}-${c.value}-soon`}
                className="absolute -top-2 right-2 bg-muted px-1.5 py-[3px] font-mono text-[10px] leading-none tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase"
              >
                Coming soon
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SubscribeDialog({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  // Opened from Slack or Discord: focus lands on the channel choice, which brings that section into view.
  const [atChannels, setAtChannels] = useState(false);
  const channelRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>({ kind: "signup" });
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const ids = { email: useId(), emailHint: useId(), directions: useId() };

  const show = (next: boolean) => {
    setOpen(next);
    if (next) sound.open();
    else sound.close();
  };

  // The manage link from an email: load the saved preferences and open by itself. The token is
  // taken out of the address bar at once, so it does not linger in history or screenshots.
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("manage");
    if (!token) return;
    url.searchParams.delete("manage");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    fetch(`/api/subscription?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; email?: string; prefs?: Prefs; frequency?: Frequency; error?: string }) => {
        if (d.ok && d.prefs && d.email) {
          setMode({ kind: "manage", token, email: d.email });
          setPrefs({ ...EMPTY_PREFS, ...d.prefs });
          setFrequency(d.frequency ? toFrequency(d.frequency) : "weekly");
        } else setError(d.error ?? "This link is not valid any more.");
        setStatus(d.ok ? "idle" : "error");
        setOpen(true);
      })
      .catch(() => {
        setError("Your saved preferences could not be loaded. Try the link again.");
        setStatus("error");
        setOpen(true);
      });
  }, []);

  // Opened from elsewhere (Slack or Discord buttons): open, then bring the channel section into view.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const section = (e as CustomEvent<{ section?: SubscribeSection }>).detail?.section;
      setAtChannels(section === "channels");
      onOpenChangeRef.current(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  /** A fresh sign-up starts from the filters the visitor has on the Jobs page right now. */
  const onOpenChange = (next: boolean) => {
    if (next) {
      if (mode.kind === "signup") track({ name: "subscribe-open" });
      if (mode.kind === "signup") setPrefs(window.location.pathname === "/" ? prefsFromQuery(window.location.search) : EMPTY_PREFS);
      setStatus("idle");
      setError(null);
    } else {
      setAtChannels(false);
      if (status === "saved") setMode({ kind: "signup" });
    }
    show(next);
  };
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const toggleCategory = (c: Category) =>
    setPrefs((p) => ({ ...p, categories: p.categories.includes(c) ? p.categories.filter((x) => x !== c) : CATEGORIES.filter((x) => x === c || p.categories.includes(x)) }));
  const selectLevel = (v: string) =>
    setPrefs((p) => {
      if (v === "any") return { ...p, levels: [] };
      const l = v as Prefs["levels"][number];
      return { ...p, levels: p.levels.includes(l) ? p.levels.filter((x) => x !== l) : [...p.levels, l] };
    });

  const validate = (value: string) => {
    const v = value.trim();
    if (!v) return "Enter your email address.";
    if (!isEmail(v)) return "That does not look like an email address. Check for typos.";
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode.kind === "signup") {
      const problem = validate(email);
      setTouched(true);
      setEmailError(problem);
      if (problem) {
        emailRef.current?.focus();
        return;
      }
    }
    setStatus("sending");
    try {
      const res =
        mode.kind === "manage"
          ? await fetch("/api/subscription", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: mode.token, prefs, frequency }) })
          : await fetch("/api/subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email.trim(), prefs, frequency, website: honeypot.current?.value ?? "" }),
            });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error ?? "Something went wrong. Try again in a minute.");
      setStatus(mode.kind === "manage" ? "saved" : "sent");
      if (mode.kind === "signup") track({ name: "subscribe-sent" });
      sound.chirp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again in a minute.");
      setStatus("error");
    }
  };

  const done = status === "sent" || status === "saved";
  const manage = mode.kind === "manage";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The trigger plays the open sound, not a click as well. */}
      <DialogTrigger render={trigger} {...OWN_CLICK_SOUND} />
      <DialogContent
        initialFocus={atChannels ? channelRef : undefined}
        className={cn("max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain p-0", done ? "sm:max-w-md" : "sm:max-w-xl")}>
        {done ? (
          <div className="grid gap-4 p-6 sm:p-8" role="status">
            <span className="flex size-10 items-center justify-center bg-brand-tint text-brand-sm">
              <MailCheck aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <DialogTitle className="font-heading text-xl">
              {status === "sent" ? "Check your inbox to confirm." : "Saved."}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {status === "sent" ? (
                <>
                  Ping sent a confirmation link to <span className="font-medium text-foreground">{email.trim()}</span>. Nothing else arrives until you click
                  it. No email? Check the spam folder.
                </>
              ) : (
                <>Ping will use your new choices from the next email.</>
              )}
            </DialogDescription>
            <div className="pt-2">
              <DialogClose render={<Button>Done</Button>} />
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid">
            <DialogHeader className="gap-2 border-b border-hairline p-6 pr-12 sm:px-8">
              <DialogTitle className="font-heading text-xl">{manage ? "Change what you get" : "Get new jobs by email"}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Only new jobs that match, at most {DIGEST_CAP} per email. Unsubscribe any time.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 p-6 sm:px-8">
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5">
                  <DataLabel id={ids.directions}>Directions</DataLabel>
                </legend>
                <div className="grid sm:grid-cols-2 sm:gap-x-6">
                  <DirectionCheckbox category="all" checked={prefs.categories.length === 0} onChange={() => setPrefs((p) => ({ ...p, categories: [] }))} />
                  {CATEGORIES.map((c) => (
                    <DirectionCheckbox key={c} category={c} checked={prefs.categories.includes(c)} onChange={() => toggleCategory(c)} />
                  ))}
                </div>
              </fieldset>

              <Segmented
                stacked
                label="Level"
                items={LEVEL_ITEMS}
                isActive={(v) => (v === "any" ? prefs.levels.length === 0 : prefs.levels.includes(v as Prefs["levels"][number]))}
                onSelect={selectLevel}
              />
              <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
                <Segmented
                  stacked
                  label="Location"
                  items={LOCATION_ITEMS}
                  isActive={(v) => (v === "1") === prefs.estonia}
                  onSelect={(v) => setPrefs((p) => ({ ...p, estonia: v === "1" }))}
                />
                <Segmented
                  stacked
                  label="Work setup"
                  items={REMOTE_ITEMS}
                  isActive={(v) => (v === "any" ? !prefs.remote : prefs.remote === v)}
                  onSelect={(v) => setPrefs((p) => ({ ...p, remote: v === "any" ? "" : (v as Prefs["remote"]) }))}
                />
              </div>

              <ChannelPicker emailRef={channelRef} />

              <Segmented stacked label="How often" items={FREQUENCY_ITEMS} isActive={(v) => v === frequency} onSelect={(v) => setFrequency(v as Frequency)} />

              {manage ? (
                <div className="grid gap-1.5">
                  <DataLabel>Email</DataLabel>
                  <p className="text-base">{mode.email}</p>
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <label htmlFor={ids.email}>
                    <DataLabel>Email</DataLabel>
                  </label>
                  <input
                    ref={emailRef}
                    id={ids.email}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched) setEmailError(validate(e.target.value));
                    }}
                    onBlur={() => {
                      if (!email.trim()) return;
                      setTouched(true);
                      setEmailError(validate(email));
                    }}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? ids.emailHint : undefined}
                    placeholder="you@example.com"
                    className={cn(
                      "h-11 w-full rounded-sm border bg-card px-3.5 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-brand-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                      emailError ? "border-destructive" : "border-hairline-strong",
                    )}
                  />
                  {emailError && (
                    <p id={ids.emailHint} className="text-sm text-destructive">
                      {emailError}
                    </p>
                  )}
                </div>
              )}

              {/* Honeypot: hidden from people and assistive tech; bots that fill every field give themselves away. */}
              <div aria-hidden className="sr-only">
                <label>
                  Website
                  <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
                </label>
              </div>
            </div>

            <div className="grid gap-4 border-t border-hairline bg-muted/40 p-6 sm:px-8">
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-[34ch] text-xs leading-relaxed text-muted-foreground">
                  {manage ? (
                    <>
                      Or{" "}
                      <a href={`/api/subscription/unsubscribe?token=${encodeURIComponent(mode.token)}`} className="text-brand-sm underline underline-offset-3 hover:no-underline">
                        unsubscribe
                      </a>
                      : that deletes your address and choices.
                    </>
                  ) : (
                    <>
                      Ping stores your email and these choices only to send these emails.{" "}
                      <Link href="/privacy" onClick={() => show(false)} className="text-brand-sm underline underline-offset-3 hover:no-underline">
                        Privacy
                      </Link>
                    </>
                  )}
                </p>
                <Button type="submit" size="lg" disabled={status === "sending"} className="w-full sm:w-auto">
                  {status === "sending" ? "Sending" : manage ? "Save changes" : "Get new jobs"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
