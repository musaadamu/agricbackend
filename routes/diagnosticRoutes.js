const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');
const Journal = require('../models/Journal');


// Configure multer for file uploads in diagnostic routes
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = path.join(__dirname, '..', 'temp');
    try {
      await fs.promises.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `test-${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  const isDocx = extname === '.docx' &&
    (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
     mimetype === 'application/docx' ||
     mimetype === 'application/vnd.ms-word');

  if (isDocx) {
    cb(null, true);
  } else {
    cb(new Error('Only .docx files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Add a diagnostic route to check file paths
router.get('/check-file/:journalId/:fileType', async (req, res) => {
    try {
        const { journalId, fileType } = req.params;

        // Find the journal
        const journal = await Journal.findById(journalId);
        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        // Get the file path based on file type
        let filePath;
        if (fileType === 'pdf') {
            filePath = journal.pdfFilePath;
        } else if (fileType === 'docx') {
            filePath = journal.docxFilePath;
        } else {
            return res.status(400).json({ message: 'Invalid file type' });
        }

        if (!filePath) {
            return res.status(404).json({ message: `No ${fileType} file path found for this journal` });
        }

        // Check possible file locations
        const possiblePaths = [
            path.resolve(path.join(__dirname, '..', '..', 'uploads', 'journals', path.basename(filePath))),
            path.resolve(path.join(__dirname, '..', 'uploads', 'journals', path.basename(filePath))),
            path.resolve(path.join(__dirname, '..', '..', '..', 'uploads', 'journals', path.basename(filePath))),
            path.resolve(path.join(__dirname, '..', '..', 'backend', 'uploads', 'journals', path.basename(filePath))),
            path.resolve(path.join(__dirname, '..', '..', '..', 'backend', 'uploads', 'journals', path.basename(filePath)))
        ];

        // Check if DOCUMENT_STORAGE_PATH is defined
        if (process.env.DOCUMENT_STORAGE_PATH) {
            possiblePaths.push(
                path.resolve(path.join(process.env.DOCUMENT_STORAGE_PATH, path.basename(filePath)))
            );
        }

        // Check each path
        const results = [];
        for (const pathToCheck of possiblePaths) {
            try {
                const exists = fs.existsSync(pathToCheck);
                results.push({
                    path: pathToCheck,
                    exists
                });
            } catch (err) {
                results.push({
                    path: pathToCheck,
                    exists: false,
                    error: err.message
                });
            }
        }

        // Return the results
        res.json({
            journalId,
            fileType,
            filePath,
            fileName: path.basename(filePath),
            possiblePaths: results
        });
    } catch (err) {
        console.error('Error checking file:', err);
        res.status(500).json({ message: 'Error checking file', error: err.message });
    }
});

// Add a route to fix file paths in the database
router.get('/fix-file-path/:journalId/:fileType', async (req, res) => {
    try {
        const { journalId, fileType } = req.params;

        // Find the journal
        const journal = await Journal.findById(journalId);
        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        // Get the current file path
        let currentPath;
        if (fileType === 'pdf') {
            currentPath = journal.pdfFilePath;
        } else if (fileType === 'docx') {
            currentPath = journal.docxFilePath;
        } else {
            return res.status(400).json({ message: 'Invalid file type' });
        }

        if (!currentPath) {
            return res.status(404).json({ message: `No ${fileType} file path found for this journal` });
        }

        // Extract the filename
        const filename = path.basename(currentPath);

        // Create the correct path format
        const correctPath = `uploads/journals/${filename}`;

        // Update the journal
        if (fileType === 'pdf') {
            journal.pdfFilePath = correctPath;
        } else if (fileType === 'docx') {
            journal.docxFilePath = correctPath;
        }

        // Save the journal
        await journal.save();

        // Return success
        res.json({
            success: true,
            journalId,
            fileType,
            oldPath: currentPath,
            newPath: correctPath
        });
    } catch (err) {
        console.error('Error fixing file path:', err);
        res.status(500).json({ message: 'Error fixing file path', error: err.message });
    }
});

// Google Drive functionality removed - using Cloudinary instead

// Journal file checking now uses Cloudinary URLs instead of Google Drive

// Add a route to test PDF conversion
router.post('/test-pdf-conversion', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('File uploaded for PDF conversion test:', req.file.path);

        // Convert DOCX to PDF
        const pdfPath = req.file.path.replace('.docx', '.pdf');

        // Extract text from DOCX
        const buffer = await fs.promises.readFile(req.file.path);
        const extractedText = await mammoth.extractRawText({ buffer });

        // Create PDF from extracted text
        await new Promise((resolve, reject) => {
            const pdfDoc = new PDFDocument();
            const pdfStream = fs.createWriteStream(pdfPath);

            pdfDoc.pipe(pdfStream);
            pdfDoc.text(extractedText.value);
            pdfDoc.end();

            pdfStream.on('finish', () => {
                console.log('PDF creation completed');
                resolve();
            });
            pdfStream.on('error', (err) => {
                console.error('PDF creation error:', err);
                reject(err);
            });
        });

        // Return success with file paths
        res.json({
            success: true,
            docxPath: req.file.path,
            pdfPath: pdfPath,
            message: 'PDF conversion successful'
        });
    } catch (error) {
        console.error('Error in PDF conversion test:', error);
        res.status(500).json({
            success: false,
            message: 'PDF conversion failed',
            error: error.message
        });
    }
});

// Add a route to test Puppeteer PDF conversion
router.post('/test-puppeteer-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('File uploaded for Puppeteer PDF conversion test:', req.file.path);

        // Import puppeteer
        const puppeteer = require('puppeteer');

        // Convert DOCX to PDF using Puppeteer
        const pdfPath = req.file.path.replace('.docx', '.pdf');

        // Extract HTML from DOCX
        const buffer = await fs.promises.readFile(req.file.path);
        const result = await mammoth.convertToHtml({ buffer });

        if (result.value.length === 0) {
            throw new Error('Extracted HTML is empty');
        }

        console.log('HTML extraction successful, length:', result.value.length);

        // Create a simple HTML document with the extracted content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Converted Document</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.5;
                        margin: 2.54cm;
                    }
                </style>
            </head>
            <body>
                ${result.value}
            </body>
            </html>
        `;

        // Launch browser and create PDF
        console.log('Launching browser for PDF creation...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        console.log('Creating PDF...');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '2.54cm',
                right: '2.54cm',
                bottom: '2.54cm',
                left: '2.54cm'
            }
        });

        await browser.close();
        console.log('Browser closed, PDF created at:', pdfPath);

        // Verify PDF was created
        const pdfStats = await fs.promises.stat(pdfPath);
        console.log('PDF file size:', pdfStats.size);

        // Return success with file paths
        res.json({
            success: true,
            docxPath: req.file.path,
            pdfPath: pdfPath,
            pdfSize: pdfStats.size,
            message: 'Puppeteer PDF conversion successful'
        });
    } catch (error) {
        console.error('Error in Puppeteer PDF conversion test:', error);
        res.status(500).json({
            success: false,
            message: 'Puppeteer PDF conversion failed',
            error: error.message,
            stack: error.stack
        });
    }
});

// Google Drive upload test removed - using Cloudinary instead

// Add a route to test direct file download
router.get('/test-direct-download/:journalId/:fileType', async (req, res) => {
    try {
        const { journalId, fileType } = req.params;
        console.log(`Testing direct download for journal ${journalId}, file type ${fileType}`);

        // Find the journal
        const journal = await Journal.findById(journalId);
        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        // Get file path based on type
        let filePath;
        if (fileType === 'pdf') {
            filePath = journal.pdfFilePath;
        } else if (fileType === 'docx') {
            filePath = journal.docxFilePath;
        } else {
            return res.status(400).json({ message: 'Invalid file type' });
        }

        if (!filePath) {
            return res.status(404).json({ message: `No ${fileType} file path found for this journal` });
        }

        console.log('Original file path:', filePath);

        // Resolve the file path
        const DOCUMENT_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH
            ? path.resolve(process.env.DOCUMENT_STORAGE_PATH)
            : path.resolve(path.join(__dirname, '..', 'uploads', 'journals'));

        // Try different possible paths
        const possiblePaths = [
            path.resolve(filePath), // Absolute path
            path.join(DOCUMENT_STORAGE_PATH, path.basename(filePath)), // Storage path + filename
            path.join(__dirname, '..', filePath), // Relative to server root
            path.join(__dirname, '..', 'uploads', 'journals', path.basename(filePath)) // Default uploads folder
        ];

        let resolvedPath = null;
        for (const testPath of possiblePaths) {
            try {
                await fs.promises.access(testPath, fs.constants.F_OK);
                const stats = await fs.promises.stat(testPath);
                if (stats.isFile() && stats.size > 0) {
                    resolvedPath = testPath;
                    break;
                }
            } catch (err) {
                // File doesn't exist or can't be accessed, try next path
            }
        }

        if (!resolvedPath) {
            return res.status(404).json({ message: 'File not found in any of the possible locations' });
        }

        console.log('Resolved file path:', resolvedPath);

        // Set appropriate content type
        let contentType;
        if (fileType === 'pdf') {
            contentType = 'application/pdf';
        } else if (fileType === 'docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resolvedPath)}"`);

        // Stream the file
        const fileStream = fs.createReadStream(resolvedPath);
        fileStream.pipe(res);

        // Handle errors
        fileStream.on('error', (err) => {
            console.error('Error streaming file:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error streaming file', error: err.message });
            }
        });
    } catch (error) {
        console.error('Error in direct download test:', error);
        res.status(500).json({ message: 'Error in direct download test', error: error.message });
    }
});

// Google Drive download test removed - using Cloudinary instead

// Add a direct file serving route for testing
router.get('/direct-file/:filename', (req, res) => {
  try {
    const { filename } = req.params;

    // Try different possible locations for the file
    const possiblePaths = [
      path.resolve(path.join(__dirname, '..', 'uploads', 'journals', filename)),
      path.resolve(path.join(__dirname, '..', 'uploads', 'diagnostics', filename)),
      path.resolve(path.join(__dirname, '..', 'temp', filename))
    ];

    // Add DOCUMENT_STORAGE_PATH if it exists
    if (process.env.DOCUMENT_STORAGE_PATH) {
      if (process.env.DOCUMENT_STORAGE_PATH.startsWith('../')) {
        const storagePath = process.env.DOCUMENT_STORAGE_PATH.replace(/^\.\.\//, '');
        possiblePaths.push(
          path.resolve(path.join(__dirname, '..', storagePath, filename))
        );
      } else {
        possiblePaths.push(
          path.resolve(path.join(process.env.DOCUMENT_STORAGE_PATH, filename))
        );
      }
    }

    console.log('Looking for file in these locations:', possiblePaths);

    // Find the first path that exists
    let filePath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ message: 'File not found' });
    }

    console.log('File found at:', filePath);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Set headers and send the file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
