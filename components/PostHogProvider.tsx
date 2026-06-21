"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      mask_all_text: false,
      capture_pageview: true,
      autocapture: false,
      session_recording: {
        maskAllInputs: false,
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
