const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files in the "uploads" folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append the file extension and timestamp
  }
});

// File type validation
const fileFilter = (req, file, cb) => {
  // Allowed file extensions
  const fileTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {  
    cb(new Error('Only images, PDFs, and documents (DOC/DOCX) are allowed!'));
  }
};

// Initialize upload with multer
const upload = multer({
  storage: storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10MB
//   fileFilter: fileFilter
});

module.exports = upload;
