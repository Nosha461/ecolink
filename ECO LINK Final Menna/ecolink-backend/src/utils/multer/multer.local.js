import fs from "node:fs";
import path from "node:path";
import multer from "multer";


export const fileValidation = {
    image: ["image/jpeg", "image/png", "image/gif"],
    video: ["video/mp4"]
}
export const localFileUpload = ({ customPath = "general", validation = [], folder = "files" } = {}) => {
     const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const userId = req.user?.id ?? req.user?._id;
            const folderName = folder || "files";
            const fullPath = path.resolve("src", "uploads", customPath, String(userId), folderName);

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, {recursive:true})
            }
            cb(null, fullPath)
        },
        filename:function (req, file, cb) {
            const userId = req.user?.id ?? req.user?._id;
            const folderName = folder || "files";
            const filename = Date.now() + "__" + Math.random() + "__" + file.originalname;
            file.finalPath = path.posix.join("uploads", customPath, String(userId), folderName, filename);
            cb(null, filename)
        }
     })

    const fileFilter = function (req, file, cb) {
        if (validation.includes(file.mimetype)) {
            return cb(null, true)
        }
        return cb("In-valid file format", false)
    }


     return multer({
        dest:"./temp",
        fileFilter,
        storage,
        limits: {
            fileSize: 100 * 1024 * 1024 // 100MB
          }
     })

}
