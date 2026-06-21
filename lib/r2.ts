import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_ENDPOINT =
  "https://b9e36c0ade58adc6746078dbb4bbb250.r2.cloudflarestorage.com";
const DEFAULT_BUCKET = "igbase2";
const IMAGE_PREFIX = "images";

let client: S3Client | null = null;

function getR2Client(): S3Client {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set");
  }

  client ??= new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT ?? DEFAULT_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function parseDataUrl(dataUrl: string): { contentType: string; body: Buffer; ext: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }
  const contentType = match[1];
  const ext =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/webp"
        ? "webp"
        : "png";
  return { contentType, body: Buffer.from(match[2], "base64"), ext };
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_URL,
  );
}

/** Upload a generated or user image to R2 and return its public URL. */
export async function uploadImageToR2(
  dataUrl: string,
  imageId: string,
): Promise<string> {
  const { contentType, body, ext } = parseDataUrl(dataUrl);
  const key = `${IMAGE_PREFIX}/${imageId}.${ext}`;
  const bucket = process.env.R2_BUCKET ?? DEFAULT_BUCKET;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${publicBase}/${key}`;
}

/**
 * Persist an image to R2 when configured; otherwise keep the data URL (local dev).
 */
export async function persistImageUrl(
  dataUrl: string,
  imageId: string,
): Promise<string> {
  if (!isR2Configured()) {
    console.warn("R2 not configured — streaming image as data URL");
    return dataUrl;
  }
  return uploadImageToR2(dataUrl, imageId);
}
