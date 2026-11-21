/** The one date format on both pages: "20 November 2026". Safe to import anywhere (no server-only code). */
export const formatUpdated = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "recently";
