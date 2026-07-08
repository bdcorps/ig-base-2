import posthog from "posthog-js";

type AnalyticsEvent =
  | "create_prompt"
  | "export_design"
  | "submit_feedback"
  | "upload_image"
  | "add_asset"
  | "mask_image_into_shape"
  | "post_to_instagram";

export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}
