"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Basic Auth has no session to end. This sends one request with the user name "logout" and a
 * throwaway password; middleware.ts answers 401, the browser replaces the cached password with the
 * throwaway one, and the next visit to /stats asks again. Then it leaves for the home page.
 */
export function LogoutButton() {
  const logout = () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/stats/logout", true, "logout", crypto.randomUUID());
    xhr.onloadend = () => window.location.replace("/");
    xhr.send();
  };
  return (
    <Button variant="outline" size="sm" onClick={logout}>
      <LogOut data-icon="inline-start" strokeWidth={1.75} />
      Log out
    </Button>
  );
}
