import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fileTypeFromBuffer } from "file-type";
import { Readable } from "node:stream";
import { AppError } from "@/lib/errors";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

let storageClient: S3Client | undefined;

function config() {
  const bucket = process.env.STORAGE_BUCKET;
  const region = process.env.STORAGE_REGION;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new AppError(503, "Armazenamento de arquivos não configurado.", "STORAGE_NOT_CONFIGURED");
  }
  return { bucket, region, accessKeyId, secretAccessKey };
}

function client() {
  const settings = config();
  storageClient ??= new S3Client({
    region: settings.region,
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });
  return storageClient;
}

export async function validateUpload(file: File, imageOnly = false) {
  const maxMb = Number(process.env.STORAGE_MAX_FILE_SIZE_MB ?? 10);
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    throw new AppError(413, `O arquivo deve ter no máximo ${maxMb} MB.`, "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !allowedTypes.has(detected.mime)) {
    throw new AppError(415, "Formato de arquivo não permitido.", "INVALID_FILE_TYPE");
  }
  if (imageOnly && !detected.mime.startsWith("image/")) {
    throw new AppError(415, "Selecione uma imagem JPG, PNG ou WEBP.", "IMAGE_REQUIRED");
  }

  return { buffer, mimeType: detected.mime, extension: allowedTypes.get(detected.mime)! };
}

export async function putPrivateObject(input: { key: string; body: Buffer; mimeType: string }) {
  const { bucket } = config();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.mimeType,
      ServerSideEncryption: "AES256",
    }),
  );
}

export async function getPrivateDownloadUrl(key: string, originalName: string, inline = false) {
  const { bucket } = config();
  const safeName = originalName.replace(/[\r\n"\\]/g, "_");
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
    }),
    { expiresIn: 60 },
  );
}

export async function getPrivateInlineObject(key: string) {
  const { bucket } = config();
  const object = await client().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  if (!object.Body || !(object.Body instanceof Readable)) {
    throw new AppError(503, "Falha ao acessar o armazenamento.", "STORAGE_READ_FAILED");
  }
  return {
    body: Readable.toWeb(object.Body) as ReadableStream<Uint8Array>,
    contentType: object.ContentType,
  };
}

export async function deletePrivateObject(key: string) {
  const { bucket } = config();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
