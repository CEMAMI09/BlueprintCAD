// backend/lib/generateThumbnailR2.js
// Generate thumbnails for CAD files stored in R2

const fs = require("fs");
const path = require("path");
const { getR2Client, uploadToR2, generateUserAssetKey } = require("./r2");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

// Lazy load generateThumbnailForDesign to avoid canvas import errors
let generateThumbnailForDesign = null;
function tryLoadThumbnailGenerator() {
  if (generateThumbnailForDesign) return generateThumbnailForDesign;
  try {
    const thumbnailModule = require("./generateThumbnail");
    generateThumbnailForDesign = thumbnailModule.generateThumbnailForDesign;
    return generateThumbnailForDesign;
  } catch (error) {
    console.warn("[Thumbnail] Canvas-based thumbnail generator not available:", error.message);
    return null;
  }
}

/**
 * Generate thumbnail for a CAD file in R2 and upload it back to R2
 * @param {string} r2FilePath - R2 object key (e.g., "users/1/cad-123.stl")
 * @param {number} projectId - Project ID for naming
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} - R2 key for thumbnail or null if failed
 */
async function generateThumbnailFromR2(r2FilePath, projectId, userId) {
  const s3Client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const tempDir = path.join(process.cwd(), "temp");
  const tempFilePath = path.join(tempDir, `temp_${projectId}_${Date.now()}${path.extname(r2FilePath)}`);

  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download file from R2 to temp location
    console.log(`[Thumbnail] Downloading ${r2FilePath} from R2...`);
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: r2FilePath,
    });

    const response = await s3Client.send(getCommand);
    
    if (!response.Body) {
      throw new Error("No file body returned from R2");
    }

    // Write to temp file
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    await fs.promises.writeFile(tempFilePath, buffer);
    console.log(`[Thumbnail] Downloaded ${buffer.length} bytes to ${tempFilePath}`);

    // Generate thumbnail - try canvas first, fallback to simple placeholder
    console.log(`[Thumbnail] Generating thumbnail for project ${projectId}...`);
    
    const thumbsDir = path.join(process.cwd(), "storage", "uploads", "thumbnails");
    if (!fs.existsSync(thumbsDir)) {
      fs.mkdirSync(thumbsDir, { recursive: true });
    }
    
    const thumbnailFileName = `${projectId}_thumb.png`;
    const thumbnailFullPath = path.join(thumbsDir, thumbnailFileName);
    let thumbnailBuffer = null;
    
    try {
      // Try to use the full thumbnail generator first (if canvas works)
      const thumbnailGen = tryLoadThumbnailGenerator();
      if (thumbnailGen) {
        try {
          const thumbnailRelativePath = await thumbnailGen(tempFilePath, projectId.toString());
          const generatedPath = path.join(process.cwd(), "storage", "uploads", thumbnailRelativePath);
          if (fs.existsSync(generatedPath)) {
            const stats = fs.statSync(generatedPath);
            if (stats.size > 15000) {
              // Use the generated thumbnail
              thumbnailBuffer = await fs.promises.readFile(generatedPath);
              console.log(`[Thumbnail] Generated 3D thumbnail: ${thumbnailBuffer.length} bytes`);
              
              // Clean up generated file after reading
              try {
                await fs.promises.unlink(generatedPath);
              } catch (cleanupError) {
                console.warn("[Thumbnail] Failed to clean up generated thumbnail:", cleanupError);
              }
            }
          }
        } catch (threeError) {
          console.warn(`[Thumbnail] 3D thumbnail generation failed:`, threeError.message);
          // Fall through to simple placeholder
        }
      } else {
        console.log(`[Thumbnail] Canvas not available, skipping 3D generation`);
      }
      
      // If 3D generation failed, use simple placeholder
      if (!thumbnailBuffer) {
        console.log(`[Thumbnail] Using simple placeholder for project ${projectId}`);
        const { generateSimplePlaceholder } = require("./generateThumbnailSimple");
        await generateSimplePlaceholder(path.basename(tempFilePath), thumbnailFullPath, projectId);
        thumbnailBuffer = await fs.promises.readFile(thumbnailFullPath);
        console.log(`[Thumbnail] Generated simple placeholder: ${thumbnailBuffer.length} bytes`);
      }

      // Upload thumbnail to R2
      const thumbnailKey = generateUserAssetKey(userId, "thumbnail", `${projectId}_thumb.png`);
      console.log(`[Thumbnail] Uploading thumbnail to R2: ${thumbnailKey}`);
      const { key: uploadedThumbnailKey } = await uploadToR2(thumbnailBuffer, thumbnailKey, "image/png");
      
      // Clean up temp files
      try {
        await fs.promises.unlink(tempFilePath);
        if (fs.existsSync(thumbnailFullPath)) {
          await fs.promises.unlink(thumbnailFullPath);
        }
      } catch (cleanupError) {
        console.warn("[Thumbnail] Failed to clean up temp files:", cleanupError);
      }

      console.log(`[Thumbnail] Successfully generated and uploaded thumbnail: ${uploadedThumbnailKey}`);
      return uploadedThumbnailKey;
    } catch (genError) {
      console.error(`[Thumbnail] Thumbnail generation error:`, genError);
      // Clean up temp file on error
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
        if (fs.existsSync(thumbnailFullPath)) {
          await fs.promises.unlink(thumbnailFullPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      return null;
    }
  } catch (error) {
    console.error(`[Thumbnail] Failed to generate thumbnail for ${r2FilePath}:`, error);
    
    // Clean up temp file on error
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return null;
  }
}

module.exports = { generateThumbnailFromR2 };

