"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        const uploadDir = path_1.default.join(process.cwd(), '..', 'screenshots');
        // Ensure upload directory exists
        if (!(0, fs_1.existsSync)(uploadDir)) {
            yield promises_1.default.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    }),
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = path_1.default.extname(file.originalname);
        const basename = path_1.default.basename(file.originalname, ext);
        const filename = `${basename}-${timestamp}${ext}`;
        cb(null, filename);
    }
});
// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5, // Maximum 5 files per request
    }
});
// Upload single screenshot
router.post('/upload/screenshot', upload.single('screenshot'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path,
            uploadedAt: new Date().toISOString(),
            jobId: req.body.jobId || null,
            step: req.body.step || null,
            description: req.body.description || null
        };
        res.json({
            message: 'Screenshot uploaded successfully',
            file: fileInfo
        });
    }
    catch (error) {
        console.error('Screenshot upload error:', error);
        res.status(500).json({ error: 'Failed to upload screenshot' });
    }
}));
// Upload multiple screenshots
router.post('/upload/screenshots', upload.array('screenshots', 5), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const fileInfos = req.files.map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path,
            uploadedAt: new Date().toISOString(),
            jobId: req.body.jobId || null,
            step: req.body.step || null,
            description: req.body.description || null
        }));
        res.json({
            message: `${fileInfos.length} screenshots uploaded successfully`,
            files: fileInfos
        });
    }
    catch (error) {
        console.error('Screenshots upload error:', error);
        res.status(500).json({ error: 'Failed to upload screenshots' });
    }
}));
// Get screenshot by filename
router.get('/screenshot/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const screenshotPath = path_1.default.join(process.cwd(), '..', 'screenshots', filename);
        // Check if file exists
        if (!(0, fs_1.existsSync)(screenshotPath)) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }
        // Get file stats
        const stats = yield promises_1.default.stat(screenshotPath);
        // Set appropriate headers
        res.set({
            'Content-Type': 'image/png',
            'Content-Length': stats.size.toString(),
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        });
        // Stream the file
        res.sendFile(screenshotPath);
    }
    catch (error) {
        console.error('Error serving screenshot:', error);
        res.status(500).json({ error: 'Failed to serve screenshot' });
    }
}));
// List all screenshots
router.get('/screenshots', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const screenshotDir = path_1.default.join(process.cwd(), '..', 'screenshots');
        // Check if directory exists
        if (!(0, fs_1.existsSync)(screenshotDir)) {
            yield promises_1.default.mkdir(screenshotDir, { recursive: true });
            return res.json({ screenshots: [] });
        }
        const files = yield promises_1.default.readdir(screenshotDir);
        const imageFiles = files.filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file));
        const screenshots = yield Promise.all(imageFiles.map((filename) => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = path_1.default.join(screenshotDir, filename);
            const stats = yield promises_1.default.stat(filePath);
            return {
                filename,
                size: stats.size,
                createdAt: stats.birthtime.toISOString(),
                modifiedAt: stats.mtime.toISOString(),
                url: `/api/uploads/screenshot/${filename}`
            };
        })));
        // Sort by creation date (newest first)
        screenshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ screenshots });
    }
    catch (error) {
        console.error('Error listing screenshots:', error);
        res.status(500).json({ error: 'Failed to list screenshots' });
    }
}));
// Delete screenshot
router.delete('/screenshot/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const screenshotPath = path_1.default.join(process.cwd(), '..', 'screenshots', filename);
        // Check if file exists
        if (!(0, fs_1.existsSync)(screenshotPath)) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }
        // Delete the file
        yield promises_1.default.unlink(screenshotPath);
        res.json({ message: 'Screenshot deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting screenshot:', error);
        res.status(500).json({ error: 'Failed to delete screenshot' });
    }
}));
// Cleanup old screenshots (older than 30 days)
router.post('/screenshots/cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const screenshotDir = path_1.default.join(process.cwd(), '..', 'screenshots');
        if (!(0, fs_1.existsSync)(screenshotDir)) {
            return res.json({ message: 'No screenshots directory found', deletedCount: 0 });
        }
        const files = yield promises_1.default.readdir(screenshotDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
        let deletedCount = 0;
        for (const filename of files) {
            const filePath = path_1.default.join(screenshotDir, filename);
            const stats = yield promises_1.default.stat(filePath);
            if (stats.birthtime < cutoffDate) {
                yield promises_1.default.unlink(filePath);
                deletedCount++;
            }
        }
        res.json({
            message: `Cleanup completed`,
            deletedCount,
            cutoffDate: cutoffDate.toISOString()
        });
    }
    catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({ error: 'Failed to cleanup screenshots' });
    }
}));
exports.default = router;
