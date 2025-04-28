// Import necessary AWS SDK clients and commands for Node.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Initialize the S3 client with your AWS credentials and region
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to use S3 for storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const now = new Date();
      // e.g., "2025" and "april" from current date
      const year = now.getFullYear();
      const month = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
      // Compose folder prefix: "2025/april/"
      const folder = `${year}/${month}`;
      // Filename with timestamp
      const filename = `${Date.now()}-${file.originalname}`;
      // Final S3 key: "2025/april/1632762923456-image.png"
      cb(null, `${folder}/${filename}`);
    },
  }),
});

module.exports = upload;
