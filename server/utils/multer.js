// File guide: multer source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import multer from "multer";

const upload = multer({ dest: "uploads/" });
export default upload;
