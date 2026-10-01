import type { ReactNode } from "react";
import Image from "next/image";
import { CircleAlertIcon, Loader2Icon } from "lucide-react";

type AuthStatusScreenProps = {
  title: string;
  description: string;
  variant?: "loading" | "error";
  action?: ReactNode;
};

export function AuthStatusScreen({ title, description, variant = "loading", action }: AuthStatusScreenProps) {
  const isError = variant === "error";
  return (
    <main className="relative isolate grid min-h-viewport place-items-center bg-efda-background px-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.10),transparent_55%)]"
      />
      <div role={isError ? "alert" : "status"} className="ma-enter w-full max-w-md rounded-[1.75rem] border bg-card p-8 text-center shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)]">
        <div className="relative mx-auto size-14">
          <Image src="/efda-logo.png" alt="EFDA logo" width={56} height={56} priority className="size-14 rounded-2xl object-contain shadow-sm" />
          <span className="absolute -bottom-1.5 -right-1.5 grid size-6 place-items-center rounded-full border bg-card">
            {isError ? (
              <CircleAlertIcon className="size-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
            ) : (
              <Loader2Icon className="size-3.5 animate-spin text-violet-600 motion-reduce:animate-none dark:text-violet-400" aria-hidden="true" />
            )}
          </span>
        </div>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </main>
  );
}
