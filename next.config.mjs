/** @type {import("next").NextConfig} */
export default {
  // The pages read data/*.json from disk at request time (lib/data.ts), so the serverless functions
  // must ship with those files.
  outputFileTracingIncludes: {
    "/": ["./data/**/*"],
    "/insights": ["./data/**/*"],
    "/discover": ["./data/**/*"],
  },
  // The Discover page started out as /companies: old links (query included) land on it.
  async redirects() {
    return [{ source: "/companies", destination: "/discover", permanent: true }];
  },
};
