import { supabase } from "@/integrations/supabase/client";

const BUCKET = "payment-proofs";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const COMPRESS_ABOVE_BYTES = 1 * 1024 * 1024; // compress images larger than 1MB
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export type AcceptedProofType = "image" | "pdf";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateProofFile(file: File): ValidationResult {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large. Maximum size is 5MB." };
  }
  const ext = getExt(file.name);
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || ext === "pdf";
  if (!isImage && !isPdf) {
    return { ok: false, error: "Only images and PDFs are allowed." };
  }
  return { ok: true };
}

export function getProofType(file: File): AcceptedProofType {
  if (file.type === "application/pdf" || getExt(file.name) === "pdf") return "pdf";
  return "image";
}

/**
 * Compress an image to JPEG if it is larger than 1MB or wider/taller than 1920px.
 * Returns a Blob (type image/jpeg). If compression fails for any reason,
 * falls back to returning the original file as a Blob.
 */
async function compressImage(file: File): Promise<Blob> {
  if (file.size <= COMPRESS_ABOVE_BYTES) return file;

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);

    const scale = Math.min(1, MAX_DIMENSION / img.width, MAX_DIMENSION / img.height);
    const targetW = Math.round(img.width * scale);
    const targetH = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob || file;
  } catch {
    // HEIC or any other unsupported format — upload as-is
    return file;
  }
}

/**
 * Upload a proof file (image or PDF) to the payment-proofs bucket.
 * Images are compressed client-side before upload.
 * Returns the public URL of the uploaded file.
 */
export async function uploadPaymentProof(
  file: File,
  paymentRowId: string
): Promise<string> {
  const type = getProofType(file);

  let blob: Blob = file;
  let ext = getExt(file.name) || (type === "pdf" ? "pdf" : "jpg");
  let contentType = file.type || (type === "pdf" ? "application/pdf" : "image/jpeg");

  if (type === "image") {
    blob = await compressImage(file);
    if (blob !== file && blob.type === "image/jpeg") {
      ext = "jpg";
      contentType = "image/jpeg";
    }
  }

  const filename = `${Date.now()}.${ext}`;
  const path = `${paymentRowId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: false });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}
