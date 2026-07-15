const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to check if R2 config is available
function isR2Configured() {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT &&
    process.env.R2_PUBLIC_URL
  );
}

/**
 * Handles screenshot uploads to Cloudflare R2.
 * Saves screenshot information to the Database.
 */
async function uploadScreenshot(videoId, timestamp, imageBuffer) {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 storage is not configured or unavailable on the server.');
  }

  const s3 = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });

  const timestampNum = parseFloat(timestamp);
  const key = `screenshots/${videoId}_${Math.floor(timestampNum)}_${Date.now()}.png`;

  const uploadParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png'
  };

  try {
    await s3.send(new PutObjectCommand(uploadParams));
    
    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

    // Save screenshot information to PostgreSQL
    const screenshot = await prisma.screenshot.create({
      data: {
        videoId,
        timestamp: timestampNum,
        r2Url: publicUrl,
        caption: `Captured at ${formatSeconds(timestampNum)}`
      }
    });

    return screenshot;
  } catch (error) {
    console.error('Error uploading screenshot to R2:', error);
    throw new Error(`R2 Upload Failed: ${error.message}`);
  }
}

// Simple seconds-to-timestamp formatter
function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

module.exports = {
  uploadScreenshot,
  isR2Configured
};
