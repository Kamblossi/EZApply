import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), '..', 'screenshots');
    
    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const filename = `${basename}-${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  }
});

// Upload single screenshot
router.post('/upload/screenshot', upload.single('screenshot'), async (req: Request, res: Response) => {
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
    
  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// Upload multiple screenshots
router.post('/upload/screenshots', upload.array('screenshots', 5), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const fileInfos = req.files.map((file: any) => ({
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
    
  } catch (error) {
    console.error('Screenshots upload error:', error);
    res.status(500).json({ error: 'Failed to upload screenshots' });
  }
});

// Get screenshot by filename
router.get('/screenshot/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const screenshotPath = path.join(process.cwd(), '..', 'screenshots', filename);
    
    // Check if file exists
    if (!existsSync(screenshotPath)) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    // Get file stats
    const stats = await fs.stat(screenshotPath);
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });
    
    // Stream the file
    res.sendFile(screenshotPath);
    
  } catch (error) {
    console.error('Error serving screenshot:', error);
    res.status(500).json({ error: 'Failed to serve screenshot' });
  }
});

// List all screenshots
router.get('/screenshots', async (req: Request, res: Response) => {
  try {
    const screenshotDir = path.join(process.cwd(), '..', 'screenshots');
    
    // Check if directory exists
    if (!existsSync(screenshotDir)) {
      await fs.mkdir(screenshotDir, { recursive: true });
      return res.json({ screenshots: [] });
    }
    
    const files = await fs.readdir(screenshotDir);
    const imageFiles = files.filter(file => 
      /\.(png|jpe?g|gif|webp)$/i.test(file)
    );
    
    const screenshots = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = path.join(screenshotDir, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          url: `/api/uploads/screenshot/${filename}`
        };
      })
    );
    
    // Sort by creation date (newest first)
    screenshots.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json({ screenshots });
    
  } catch (error) {
    console.error('Error listing screenshots:', error);
    res.status(500).json({ error: 'Failed to list screenshots' });
  }
});

// Delete screenshot
router.delete('/screenshot/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const screenshotPath = path.join(process.cwd(), '..', 'screenshots', filename);
    
    // Check if file exists
    if (!existsSync(screenshotPath)) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    // Delete the file
    await fs.unlink(screenshotPath);
    
    res.json({ message: 'Screenshot deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    res.status(500).json({ error: 'Failed to delete screenshot' });
  }
});

// Cleanup old screenshots (older than 30 days)
router.post('/screenshots/cleanup', async (req: Request, res: Response) => {
  try {
    const screenshotDir = path.join(process.cwd(), '..', 'screenshots');
    
    if (!existsSync(screenshotDir)) {
      return res.json({ message: 'No screenshots directory found', deletedCount: 0 });
    }
    
    const files = await fs.readdir(screenshotDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
    
    let deletedCount = 0;
    
    for (const filename of files) {
      const filePath = path.join(screenshotDir, filename);
      const stats = await fs.stat(filePath);
      
      if (stats.birthtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    res.json({ 
      message: `Cleanup completed`,
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup screenshots' });
  }
});

export default router;
