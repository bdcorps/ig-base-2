/**
 * Few-shot design examples.
 *
 * Each example shows the model the exact tool-call sequence it should produce
 * for a given brief. These are injected as fake assistant/tool turns before
 * the real user prompt so the model learns the expected call order, naming
 * conventions, and layout patterns.
 */

export interface ExampleToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface DesignExample {
  brief: string;
  toolCalls: ExampleToolCall[];
}

export const examples: DesignExample[] = [
  // ── Example 1: Q&A hook slide (warm gradient, pill label, CTA chip) ──────
  {
    brief:
      "Q&A carousel: How to start a business from scratch (if you've never done it before). Friendly, approachable.",
    toolCalls: [
      {
        tool: "setPalette",
        args: { background: "#FFF8F0", text: "#3D2C1E", accent: "#E8663D" },
      },
      {
        tool: "setGradientBackground",
        args: { from: "#FFF8F0", to: "#FFE8D6", angle: 160 },
      },
      // Small pill label centered near the top
      {
        tool: "addTextElement",
        args: {
          kind: "text",
          x: 463,
          y: 253,
          width: 101,
          rotation: 0,
          content: "Q&A",
          font: "body",
          fontSize: 26,
          fontWeight: 700,
          color: "background",
          align: "center",
          italic: false,
          uppercase: true,
          lineHeight: 1.1,
          letterSpacing: 2,
          background: "accent",
          paddingX: 22,
          paddingY: 10,
          borderRadius: 32,
        },
      },
      // Main headline with inline accent on "from scratch"
      {
        tool: "addTextElement",
        args: {
          kind: "text",
          x: 69,
          y: 331,
          width: 920,
          rotation: 0,
          content: "How to start a business from scratch",
          segments: [
            { text: "How to start a business " },
            { text: "from scratch", color: "accent" },
          ],
          font: "heading",
          fontSize: 92,
          fontWeight: 300,
          color: "text",
          align: "center",
          italic: false,
          uppercase: false,
          lineHeight: 1.1,
          letterSpacing: 0,
          paddingX: 0,
          paddingY: 0,
          borderRadius: 0,
        },
      },
      // Italic sub-headline
      {
        tool: "addTextElement",
        args: {
          kind: "text",
          x: 88,
          y: 690,
          width: 900,
          rotation: 0,
          content: "(if you've never done it before)",
          font: "body",
          fontSize: 36,
          fontWeight: 400,
          color: "text",
          align: "center",
          italic: true,
          uppercase: false,
          lineHeight: 1.2,
          letterSpacing: 0,
          paddingX: 0,
          paddingY: 0,
          borderRadius: 0,
        },
      },
      // CTA pill at the bottom — compact accent pill, dark text on bright accent
      {
        tool: "addTextElement",
        args: {
          kind: "text",
          x: 410,
          y: 1150,
          width: 260,
          rotation: 0,
          content: "Start",
          font: "body",
          fontSize: 40,
          fontWeight: 500,
          color: "text",
          align: "center",
          italic: false,
          uppercase: false,
          lineHeight: 1.1,
          letterSpacing: 0,
          background: "accent",
          paddingX: 56,
          paddingY: 16,
          borderRadius: 999,
        },
      },
    ],
  },
];
