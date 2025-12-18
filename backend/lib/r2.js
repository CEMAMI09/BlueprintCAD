// backend/lib/r2.js
// Cloudflare R2 helper using S3-compatible API

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

let r2Client = null;

function getR2Client() {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("R2 environment variables are not fully configured");
    }

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return r2Client;
}

/**
 * Upload a file buffer to Cloudflare R2 and return the object key and public URL.
 * @param {Buffer} buffer
 * @param {string} key
 * @param {string} contentType
 */
async function uploadToR2(buffer, key, contentType) {
  const bucket = process.env.R2_BUCKET_NAME;
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL;
  const publicUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : null;

  return { key, url: publicUrl };
}

/**
 * Generate a unique object key for a user asset (profile picture, banner, etc.)
 */
function generateUserAssetKey(userId, type, originalFilename) {
  const ext = originalFilename && originalFilename.includes(".")
    ? originalFilename.substring(originalFilename.lastIndexOf("."))
    : "";
  const safeType = type || "asset";
  const random = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  return `users/${userId}/${safeType}-${timestamp}-${random}${ext}`;
}

module.exports = {
  getR2Client,
  uploadToR2,
  generateUserAssetKey,
};


