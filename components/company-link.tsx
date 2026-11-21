"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/components/usage-beacon";

/** A link to one company's jobs on Jobs (?company=), counted as a company click in the usage stats. */
export function CompanyJobsLink({ companyKey, onClick, ...props }: ComponentProps<typeof Link> & { companyKey: string }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        track({ name: "company", id: companyKey });
      }}
    />
  );
}
