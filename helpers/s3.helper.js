const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');
const logger = require('./logger.helper');

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`;

// folder: 'services', 'categories', 'reviews', 'avatars', etc.
const uploadObject = async (file, folder = 'uploads') => {
  const ext    = file.originalname.split('.').pop();
  const key    = `${folder}/${randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET_NAME,
    Key:         key,
    Body:        file.buffer,
    ContentType: file.mimetype,
  }));

  return {
    key,
    url: `${CLOUDFRONT_URL}/${key}`,
  };
};

const deleteObject = async (key) => {
    if (!key) return false;

    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        logger.info(`Successfully deleted object: ${key}`);
        return true;
    } catch (error) {
        logger.error(`Error deleting object from S3: ${error}`);
        throw error;
    }
};

const deleteObjects = async (keys = []) => {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length === 0) return;

    await Promise.allSettled(validKeys.map((key) => deleteObject(key)));
};

module.exports = {
    uploadObject,
    deleteObject,
    deleteObjects,
};
