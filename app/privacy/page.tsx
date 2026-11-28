import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Band } from "@/components/blueprint";
import { DataLabel } from "@/components/filter-controls";

export const metadata: Metadata = {
  title: "Privacy",
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
      <h2 className="m-0">
        <DataLabel>{label}</DataLabel>
      </h2>
      <div className="grid max-w-prose gap-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}

const STORED = [
  ["Email address", "where the job emails go"],
  ["Preferences", "directions, level, location and work setup you picked"],
  ["Frequency", "weekly or twice a week"],
  ["Confirmed or not", "nothing is sent until you confirm"],
  ["A random token", "the key in your change and unsubscribe links"],
  ["Two dates", "when you signed up and when the last email went out"],
];

export default function PrivacyPage() {
  return (
    <Band aria-labelledby="privacy-heading" inner="grid gap-10 py-12 sm:py-16">
      <div className="grid gap-4">
        <h1 id="privacy-heading">Privacy</h1>
        <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
          Ping is curious about jobs, not about you. No account needed: the only personal data kept is for the job emails, and only if you sign up for them.
        </p>
      </div>

      <Section label="What is stored">
        <ul className="grid gap-2">
          {STORED.map(([what, why]) => (
            <li key={what} className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
              <span className="font-medium">{what}</span>
              <span className="text-muted-foreground">{why}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">Nothing else: no name, no tracking pixels in the emails, no click tracking in the emails.</p>
      </Section>

      <Section label="Why">
        <p>To send the emails you asked for: new design jobs that match your preferences, weekly or twice a week, at most 10 per email, and only when there is something new.</p>
        <p className="text-muted-foreground">
          To stop the sign-up form being used to flood someone&rsquo;s inbox, a scrambled (hashed) form of your IP address is kept for up to an hour. It is
          never linked to your email.
        </p>
      </Section>

      <Section label="Where">
        <p>
          The list lives in a Neon Postgres database in Frankfurt, in the EU. Emails are delivered by Resend, which receives your address only to send them. Your
          data is never sold or shared with anyone else.
        </p>
      </Section>

      <Section label="How to delete it">
        <p>
          Every email has an <strong className="font-medium">Unsubscribe</strong> link. One click deletes your record: the address, the preferences, everything.
          A sign-up that is never confirmed is deleted after 7 days.
        </p>
        <p className="text-muted-foreground">
          To change what you get instead, use <strong className="font-medium text-foreground">Change what you get</strong> in any email. Questions:{" "}
          <a href="https://ragne.me" className="text-brand-sm underline underline-offset-4 hover:no-underline">
            Ragne Selis
          </a>
          , who builds and maintains Ping.
        </p>
      </Section>

      <Section label="Usage stats">
        <p>
          To see how Ping is used, it counts anonymous numbers per day: page views and visitors, which page a visit came from (the site&rsquo;s name
          only), the country, phone or desktop, which job postings are opened, which filters and searches are used, how often &ldquo;Get new jobs&rdquo; is
          opened, and snake games.
        </p>
        <p className="text-muted-foreground">
          No cookies, no IP addresses and no identifier: nothing is stored that could tell one visitor from another, and the numbers are only ever
          totals. Your browser keeps a small note in its own storage so a reload or a second visit on the same day is not counted twice; it never
          leaves your device.
        </p>
      </Section>

      <Section label="On this device">
        <p className="text-muted-foreground">Your theme and sound choices, and the note that today&rsquo;s visit was counted, are saved in this browser only and never leave it. Your filter and sort choices on Jobs are kept in your own browser too, so they are there next time; Reset clears them.</p>
      </Section>
    </Band>
  );
}
