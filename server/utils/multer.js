import multer from "multer";

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file?.mimetype?.startsWith("image/")) {
      callback(null, true);
      return;
    }

    callback(new Error("Only image uploads are allowed."));
  },
});

export default upload;
