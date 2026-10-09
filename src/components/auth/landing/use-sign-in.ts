"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, safeReturnPath } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/stores/session.store";
import { createSessionFromUser } from "@/lib/models/session.model";
import { programForPath } from "./landing-content";

export type SignInStatus = "checking" | "idle" | "redirecting";

export interface SignInState {
  status: SignInStatus;
  error: string | null;
  notice: string | null;
  signIn: () => Promise<void>;
}

/** Session check + OIDC redirect shared by every landing variant. */
export function useSignIn(): SignInState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
  const returnPath = safeReturnPath(searchParams.get("return"));
  const reason = searchParams.get("reason");
  const [status, setStatus] = useState<SignInStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await authService?.getUser();
      if (!active) return;
      if (user && !user.expired) {
        setSession(createSessionFromUser(user));
        router.replace(returnPath);
        return;
      }
      setStatus("idle");
    })();
    return () => {
      active = false;
    };
  }, [returnPath, router, setSession]);

  const signIn = async () => {
    if (!authService) return;
    setError(null);
    setStatus("redirecting");
    try {
      await authService.login(returnPath);
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "Unable to reach the sign-in service.");
      setStatus("idle");
    }
  };

  const destination = returnPath === "/" ? null : (programForPath(returnPath)?.title ?? "the page you requested");
  const notice =
    reason === "signed-out"
      ? "You have been signed out. Sign in again to continue."
      : destination
        ? `Your session has ended or you are not signed in. Sign in to continue to ${destination}.`
        : null;

  return { status, error, notice, signIn };
}
