import { generateColourPalette } from "@/lib/colorGenerator";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Missing parameters - provide prompt" },
      { status: 400 },
    );
  }

  const prompt =
    typeof json === "object" &&
    json !== null &&
    "prompt" in json &&
    typeof json.prompt === "string"
      ? json.prompt.trim()
      : "";

  if (!prompt) {
    return NextResponse.json(
      { message: "prompt is required" },
      { status: 400 },
    );
  }

  try {
    const result = await generateColourPalette(prompt);

    return NextResponse.json({
      slide: result.slide,
      moodProfile: result.moodProfile,
      palettes: result.palettes,
      selectedPaletteId: result.selectedPaletteId,
    });
  } catch (error) {
    console.error("Colour generator failed", error);

    return NextResponse.json(
      { message: "Could not generate colours. Please try again." },
      { status: 500 },
    );
  }
}
