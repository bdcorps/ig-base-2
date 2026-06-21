import posthog from "posthog-js";

type AnalyticsEvent = "create_prompt" | "export_design";

export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}
