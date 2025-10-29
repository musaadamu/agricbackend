const fs = require("fs");
const fsPromises = require("fs").promises;
const PublishedJournal = require("../models/PublishedJournal");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Configure Cloudinary - using environment variables only
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: process.env.CLOUDINARY_SECURE === 'true',
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing Cloudinary environment variables for Published Journals');
    console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

// Helper function to get upload directory
const getUploadDir = () => {
    const uploadDir = process.env.DOCUMENT_STORAGE_PATH 
        ? path.resolve(process.env.DOCUMENT_STORAGE_PATH.replace('journals', 'published-journals'))
        : path.resolve(path.join(__dirname, '..', 'uploads', 'published-journals'));
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    return uploadDir;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = getUploadDir();
        console.log('Published Journal Upload directory:', uploadDir);
        try {
            await fsPromises.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            console.error('Error creating upload directory:', error);
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${sanitizedName}`;
        cb(null, filename);
    }
});

// File filter for published journals
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Helper function to calculate volume from date
function calculateVolume(date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    let quarter;
    if (month >= 1 && month <= 3) quarter = 1;
    else if (month >= 4 && month <= 6) quarter = 2;
    else if (month >= 7 && month <= 9) quarter = 3;
    else quarter = 4;
    
    return { year, quarter };
}

// Get all published journals (current year only)
const getAllPublishedJournals = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const currentYear = new Date().getFullYear();
        
        const query = {
            volume_year: currentYear,
            status: 'published',
            is_archived: false
        };
        
        // Add search functionality
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }
        
        // Add quarter filter
        if (req.query.quarter) {
            query.volume_quarter = parseInt(req.query.quarter);
        }
        
        const journals = await PublishedJournal.find(query)
            .sort({ volume_quarter: 1, publication_date: -1 })
            .skip(skip)
            .limit(limit);
            
        const totalJournals = await PublishedJournal.countDocuments(query);
        const totalPages = Math.ceil(totalJournals / limit);
        
        res.status(200).json({
            success: true,
            data: {
                journals,
                currentPage: page,
                totalPages,
                currentYear,
                totalJournals
            },
            message: 'Published journals retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching published journals:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching published journals',
            error: error.message
        });
    }
};

// Get archived journals by year
const getArchivedJournals = async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        if (!year || year < 2000 || year > new Date().getFullYear()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year provided'
            });
        }
        
        const query = {
            volume_year: year,
            is_archived: true,
            status: 'published'
        };
        
        if (req.query.quarter) {
            query.volume_quarter = parseInt(req.query.quarter);
        }
        
        const journals = await PublishedJournal.find(query)
            .sort({ volume_quarter: 1, publication_date: -1 })
            .skip(skip)
            .limit(limit);
            
        const totalJournals = await PublishedJournal.countDocuments(query);
        const totalPages = Math.ceil(totalJournals / limit);
        
        res.status(200).json({
            success: true,
            data: {
                journals,
                currentPage: page,
                totalPages,
                year,
                totalJournals
            },
            message: `Archived journals for ${year} retrieved successfully`
        });
    } catch (error) {
        console.error('Error fetching archived journals:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching archived journals',
            error: error.message
        });
    }
};

// Get single published journal by ID
const getJournalById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID'
            });
        }
        
        const journal = await PublishedJournal.findById(id);
        
        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: { journal },
            message: 'Published journal retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching published journal:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching published journal',
            error: error.message
        });
    }
};

// Submit journal for publication
const submitJournalForPublication = async (req, res) => {
    try {
        console.log('=== PUBLISHED JOURNAL SUBMISSION STARTED ===');
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { title, abstract, authors, keywords, submitted_by } = req.body;

        // Validate required fields
        if (!title || !abstract || !authors) {
            return res.status(400).json({
                success: false,
                message: 'Title, abstract, and authors are required'
            });
        }

        // Parse authors and keywords if they're strings
        let authorsArray = Array.isArray(authors) ? authors :
                          typeof authors === 'string' ? authors.split(',').map(a => a.trim()) : [];
        let keywordsArray = Array.isArray(keywords) ? keywords :
                           typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : [];

        // Calculate volume from current date
        const volume = calculateVolume(new Date());

        // Upload file to Cloudinary
        console.log('Uploading file to Cloudinary...');
        let cloudinaryUrl = null;
        try {
            // Create a clean public_id without special characters
            const cleanFilename = req.file.filename
                .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
                .replace(/\s+/g, '_')               // Replace spaces with underscore
                .toLowerCase();

            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                resource_type: 'raw',
                folder: `${process.env.CLOUDINARY_FOLDER || 'agricjournal'}/published-journals`,
                public_id: `${Date.now()}-${cleanFilename}`,
                use_filename: true,
                unique_filename: false,
                overwrite: true,
                access_mode: 'public',
                type: 'upload'
            });

            cloudinaryUrl = uploadResult.secure_url;
            console.log('File uploaded to Cloudinary:', cloudinaryUrl);
        } catch (cloudinaryError) {
            console.error('Cloudinary upload failed:', cloudinaryError);
            // Continue with local file path if Cloudinary fails
        }

        // Create new published journal entry
        const publishedJournal = new PublishedJournal({
            title,
            abstract,
            authors: authorsArray,
            keywords: keywordsArray,
            content_file_path: req.file.path,
            pdfCloudinaryUrl: cloudinaryUrl,
            volume_year: volume.year,
            volume_quarter: volume.quarter,
            status: 'submitted',
            file_size: req.file.size,
            file_type: req.file.mimetype,
            submitted_by: submitted_by || 'Anonymous'
        });

        const savedJournal = await publishedJournal.save();

        // Clean up local file after successful Cloudinary upload
        if (cloudinaryUrl) {
            try {
                await fsPromises.unlink(req.file.path);
                console.log('Local file cleaned up after Cloudinary upload');
            } catch (unlinkError) {
                console.error('Error cleaning up local file:', unlinkError);
            }
        }

        console.log('=== PUBLISHED JOURNAL SUBMISSION COMPLETED ===');

        res.status(201).json({
            success: true,
            data: { journal: savedJournal },
            message: 'Journal submitted for publication successfully'
        });

    } catch (error) {
        console.error('Error submitting journal for publication:', error);

        // Clean up uploaded file on error
        if (req.file?.path) {
            try {
                await fsPromises.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file on error:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error submitting journal for publication',
            error: error.message
        });
    }
};

// Update journal status/details
const updateJournalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, review_notes, reviewed_by, page_numbers } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID'
            });
        }

        const journal = await PublishedJournal.findById(id);
        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }

        // Update fields
        if (status) journal.status = status;
        if (review_notes) journal.review_notes = review_notes;
        if (reviewed_by) journal.reviewed_by = reviewed_by;
        if (page_numbers) journal.page_numbers = page_numbers;

        // Set review date if status is being updated
        if (status && status !== journal.status) {
            journal.review_date = new Date();
        }

        const updatedJournal = await journal.save();

        res.status(200).json({
            success: true,
            data: { journal: updatedJournal },
            message: 'Journal updated successfully'
        });

    } catch (error) {
        console.error('Error updating journal:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating journal',
            error: error.message
        });
    }
};

// Delete journal
const deleteJournal = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID'
            });
        }

        const journal = await PublishedJournal.findById(id);
        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }

        // Delete file from Cloudinary if exists
        if (journal.pdfCloudinaryUrl) {
            try {
                // Extract public_id from Cloudinary URL
                const urlParts = journal.pdfCloudinaryUrl.split('/');
                const publicIdWithExtension = urlParts[urlParts.length - 1];
                const publicId = publicIdWithExtension.split('.')[0];

                await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                console.log('File deleted from Cloudinary');
            } catch (cloudinaryError) {
                console.error('Error deleting from Cloudinary:', cloudinaryError);
            }
        }

        // Delete local file if exists
        if (journal.content_file_path && fs.existsSync(journal.content_file_path)) {
            try {
                await fsPromises.unlink(journal.content_file_path);
                console.log('Local file deleted');
            } catch (unlinkError) {
                console.error('Error deleting local file:', unlinkError);
            }
        }

        await PublishedJournal.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Journal deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting journal:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting journal',
            error: error.message
        });
    }
};

// Get journals by volume (year and quarter)
const getJournalsByVolume = async (req, res) => {
    try {
        const { year, quarter } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const yearNum = parseInt(year);
        const quarterNum = parseInt(quarter);

        if (!yearNum || !quarterNum || quarterNum < 1 || quarterNum > 4) {
            return res.status(400).json({
                success: false,
                message: 'Invalid year or quarter provided'
            });
        }

        const query = {
            volume_year: yearNum,
            volume_quarter: quarterNum,
            status: 'published'
        };

        const journals = await PublishedJournal.find(query)
            .sort({ publication_date: -1 })
            .skip(skip)
            .limit(limit);

        const totalJournals = await PublishedJournal.countDocuments(query);
        const totalPages = Math.ceil(totalJournals / limit);

        res.status(200).json({
            success: true,
            data: {
                journals,
                currentPage: page,
                totalPages,
                volume: { year: yearNum, quarter: quarterNum },
                totalJournals
            },
            message: `Journals for ${yearNum} Quarter ${quarterNum} retrieved successfully`
        });

    } catch (error) {
        console.error('Error fetching journals by volume:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching journals by volume',
            error: error.message
        });
    }
};

// Publish a journal (change status to published)
const publishJournal = async (req, res) => {
    try {
        const { id } = req.params;
        const { page_numbers, reviewed_by } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID'
            });
        }

        const journal = await PublishedJournal.findById(id);
        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Journal not found'
            });
        }

        if (journal.status !== 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Only accepted journals can be published'
            });
        }

        journal.status = 'published';
        journal.publication_date = new Date();
        journal.reviewed_by = reviewed_by || journal.reviewed_by;
        journal.page_numbers = page_numbers || journal.page_numbers;

        const publishedJournal = await journal.save();

        res.status(200).json({
            success: true,
            data: { journal: publishedJournal },
            message: 'Journal published successfully'
        });

    } catch (error) {
        console.error('Error publishing journal:', error);
        res.status(500).json({
            success: false,
            message: 'Error publishing journal',
            error: error.message
        });
    }
};

// Get journals pending review
const getPendingReview = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status || 'all';

        let query = {};
        if (status === 'all') {
            query.status = { $in: ['submitted', 'under_review', 'accepted'] };
        } else {
            query.status = status;
        }

        const journals = await PublishedJournal.find(query)
            .sort({ submission_date: 1 })
            .skip(skip)
            .limit(limit);

        const totalJournals = await PublishedJournal.countDocuments(query);
        const totalPages = Math.ceil(totalJournals / limit);

        // Get counts by status
        const statusCounts = await PublishedJournal.aggregate([
            { $match: { status: { $in: ['submitted', 'under_review', 'accepted', 'rejected'] } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const counts = {};
        statusCounts.forEach(item => {
            counts[item._id] = item.count;
        });

        res.status(200).json({
            success: true,
            data: {
                journals,
                currentPage: page,
                totalPages,
                totalJournals,
                statusCounts: counts
            },
            message: 'Pending journals retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching pending journals:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending journals',
            error: error.message
        });
    }
};

// Download published journal PDF file
const downloadPublishedJournalPdf = async (req, res) => {
    console.log('\n🔴 DOWNLOAD PUBLISHED JOURNAL PDF REQUESTED 🔴');
    console.log('Request received at:', new Date().toISOString());

    try {
        const journalId = req.params.id;
        console.log('Journal ID:', journalId);

        if (!mongoose.Types.ObjectId.isValid(journalId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID format'
            });
        }

        const journal = await PublishedJournal.findById(journalId);
        if (!journal) {
            console.error('Published journal not found with ID:', journalId);
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }

        console.log('Published journal found:', {
            id: journal._id,
            title: journal.title,
            pdfCloudinaryUrl: journal.pdfCloudinaryUrl || 'Not set',
            content_file_path: journal.content_file_path || 'Not set'
        });

        // Get the download URL (prefer Cloudinary URL)
        const downloadUrl = journal.pdfCloudinaryUrl || journal.content_file_path;
        if (!downloadUrl) {
            console.error('No download URL found for published journal');
            return res.status(404).json({
                success: false,
                message: 'No file found for this published journal'
            });
        }

        // For Cloudinary URLs, add fl_attachment flag for better download experience
        let finalDownloadUrl = downloadUrl;
        if (downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
            const urlParts = downloadUrl.split('/upload/');
            if (urlParts.length === 2) {
                finalDownloadUrl = `${urlParts[0]}/upload/fl_attachment/${urlParts[1]}`;
                console.log('Using Cloudinary URL with fl_attachment:', finalDownloadUrl);
            }
        }

        console.log('Redirecting to download URL:', finalDownloadUrl);
        res.redirect(finalDownloadUrl);

    } catch (error) {
        console.error('Error downloading published journal PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading published journal',
            error: error.message
        });
    }
};

// Download published journal DOCX file (if available)
const downloadPublishedJournalDocx = async (req, res) => {
    console.log('\n🔴 DOWNLOAD PUBLISHED JOURNAL DOCX REQUESTED 🔴');
    console.log('Request received at:', new Date().toISOString());

    try {
        const journalId = req.params.id;
        console.log('Journal ID:', journalId);

        if (!mongoose.Types.ObjectId.isValid(journalId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID format'
            });
        }

        const journal = await PublishedJournal.findById(journalId);
        if (!journal) {
            console.error('Published journal not found with ID:', journalId);
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }

        // Check for DOCX URL (published journals might not have separate DOCX files)
        const downloadUrl = journal.docxCloudinaryUrl || journal.content_file_path;
        if (!downloadUrl) {
            console.error('No DOCX file found for published journal');
            return res.status(404).json({
                success: false,
                message: 'No DOCX file found for this published journal'
            });
        }

        // For Cloudinary URLs, add fl_attachment flag
        let finalDownloadUrl = downloadUrl;
        if (downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
            const urlParts = downloadUrl.split('/upload/');
            if (urlParts.length === 2) {
                finalDownloadUrl = `${urlParts[0]}/upload/fl_attachment/${urlParts[1]}`;
                console.log('Using Cloudinary URL with fl_attachment:', finalDownloadUrl);
            }
        }

        console.log('Redirecting to download URL:', finalDownloadUrl);
        res.redirect(finalDownloadUrl);

    } catch (error) {
        console.error('Error downloading published journal DOCX:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading published journal',
            error: error.message
        });
    }
};

// Direct download published journal PDF (streams through server)
const directDownloadPublishedJournalPdf = async (req, res) => {
    console.log('\n🔴 DIRECT DOWNLOAD PUBLISHED JOURNAL PDF REQUESTED 🔴');
    console.log('Request received at:', new Date().toISOString());

    try {
        const journalId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(journalId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID format'
            });
        }

        const journal = await PublishedJournal.findById(journalId);
        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }

        const downloadUrl = journal.pdfCloudinaryUrl || journal.content_file_path;
        if (!downloadUrl) {
            return res.status(404).json({
                success: false,
                message: 'No file found for this published journal'
            });
        }

        console.log('Downloading file from URL:', downloadUrl);

        // Stream the file through the server
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 30000
        });

        // Set appropriate headers
        const filename = `${journal.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Pipe the response
        response.data.pipe(res);

        response.data.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error streaming file'
                });
            }
        });

    } catch (error) {
        console.error('Error in direct download:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error downloading file',
                error: error.message
            });
        }
    }
};

// Direct download published journal DOCX (streams through server)
const directDownloadPublishedJournalDocx = async (req, res) => {
    console.log('\n🔴 DIRECT DOWNLOAD PUBLISHED JOURNAL DOCX REQUESTED 🔴');

    try {
        const journalId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(journalId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid journal ID format'
            });
        }

        const journal = await PublishedJournal.findById(journalId);
        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Published journal not found'
            });
        }

        const downloadUrl = journal.docxCloudinaryUrl || journal.content_file_path;
        if (!downloadUrl) {
            return res.status(404).json({
                success: false,
                message: 'No DOCX file found for this published journal'
            });
        }

        console.log('Downloading DOCX file from URL:', downloadUrl);

        // Stream the file through the server
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 30000
        });

        // Set appropriate headers
        const filename = `${journal.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Pipe the response
        response.data.pipe(res);

        response.data.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error streaming file'
                });
            }
        });

    } catch (error) {
        console.error('Error in direct DOCX download:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error downloading file',
                error: error.message
            });
        }
    }
};

// Get comprehensive published journal statistics
const getPublishedJournalStats = async (req, res) => {
    try {
        const { year } = req.query;
        const currentYear = year ? parseInt(year) : new Date().getFullYear();

        console.log(`📊 Fetching statistics for year: ${currentYear}`);

        // 1. Overview Statistics
        const [
            totalJournals,
            currentYearJournals,
            totalSubmissions,
            pendingReviews
        ] = await Promise.all([
            PublishedJournal.countDocuments({ status: 'published' }),
            PublishedJournal.countDocuments({
                status: 'published',
                volume_year: currentYear
            }),
            PublishedJournal.countDocuments({}), // All submissions regardless of status
            PublishedJournal.countDocuments({ status: { $in: ['submitted', 'under_review'] } })
        ]);

        // 2. Total Downloads Calculation
        const downloadStats = await PublishedJournal.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: null,
                    totalDownloads: { $sum: { $ifNull: ['$downloadCount', 0] } },
                    avgDownloads: { $avg: { $ifNull: ['$downloadCount', 0] } }
                }
            }
        ]);

        // 3. Unique Authors Count
        const authorStats = await PublishedJournal.aggregate([
            { $match: { status: 'published' } },
            { $unwind: '$authors' },
            { $group: { _id: { $toLower: { $trim: { input: '$authors' } } } } },
            { $count: 'uniqueAuthors' }
        ]);

        // 4. Quarterly Statistics for Selected Year
        const quarterlyStats = await PublishedJournal.aggregate([
            {
                $match: {
                    status: 'published',
                    volume_year: currentYear
                }
            },
            {
                $group: {
                    _id: '$volume_quarter',
                    count: { $sum: 1 },
                    downloads: { $sum: { $ifNull: ['$downloadCount', 0] } },
                    avgDownloads: { $avg: { $ifNull: ['$downloadCount', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Ensure all quarters are represented (1-4)
        const completeQuarterlyStats = [1, 2, 3, 4].map(quarter => {
            const existing = quarterlyStats.find(q => q._id === quarter);
            return existing || {
                _id: quarter,
                count: 0,
                downloads: 0,
                avgDownloads: 0
            };
        });

        // 5. Yearly Trends (Last 5 years)
        const yearlyStats = await PublishedJournal.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: '$volume_year',
                    count: { $sum: 1 },
                    downloads: { $sum: { $ifNull: ['$downloadCount', 0] } },
                    avgDownloads: { $avg: { $ifNull: ['$downloadCount', 0] } },
                    uniqueAuthors: { $addToSet: '$authors' }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 5 }
        ]);

        // 6. Top Performing Journals
        const topJournals = await PublishedJournal.find({
            status: 'published',
            downloadCount: { $gt: 0 }
        })
            .sort({ downloadCount: -1 })
            .limit(10)
            .select('title authors volume_year volume_quarter downloadCount createdAt')
            .lean();

        // 7. Recent Activity (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivity = await PublishedJournal.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // 8. Status Distribution
        const statusDistribution = await PublishedJournal.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // 9. Available Years for Archive
        const availableYears = await PublishedJournal.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: '$volume_year',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // 10. Monthly Trends for Current Year
        const monthlyTrends = await PublishedJournal.aggregate([
            {
                $match: {
                    status: 'published',
                    volume_year: currentYear
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 },
                    downloads: { $sum: { $ifNull: ['$downloadCount', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log(`📈 Statistics Summary:
        - Total Journals: ${totalJournals}
        - Current Year (${currentYear}): ${currentYearJournals}
        - Total Downloads: ${downloadStats[0]?.totalDownloads || 0}
        - Unique Authors: ${authorStats[0]?.uniqueAuthors || 0}`);

        res.json({
            success: true,
            data: {
                overview: {
                    totalJournals,
                    currentYearJournals,
                    totalSubmissions,
                    pendingReviews,
                    totalDownloads: downloadStats[0]?.totalDownloads || 0,
                    avgDownloads: Math.round(downloadStats[0]?.avgDownloads || 0),
                    totalAuthors: authorStats[0]?.uniqueAuthors || 0,
                    currentYear
                },
                quarterlyStats: completeQuarterlyStats.map(q => ({
                    quarter: q._id,
                    count: q.count,
                    downloads: q.downloads,
                    avgDownloads: Math.round(q.avgDownloads || 0)
                })),
                yearlyStats: yearlyStats.map(y => ({
                    year: y._id,
                    count: y.count,
                    downloads: y.downloads,
                    avgDownloads: Math.round(y.avgDownloads || 0),
                    uniqueAuthors: y.uniqueAuthors ? y.uniqueAuthors.flat().length : 0
                })),
                topJournals: topJournals.map(journal => ({
                    ...journal,
                    downloadCount: journal.downloadCount || 0
                })),
                recentActivity: recentActivity.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                statusDistribution: statusDistribution.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                availableYears: availableYears.map(y => y._id),
                monthlyTrends: monthlyTrends.map(m => ({
                    month: m._id,
                    count: m.count,
                    downloads: m.downloads
                })),
                generatedAt: new Date().toISOString(),
                requestedYear: currentYear
            }
        });
    } catch (error) {
        console.error('❌ Error fetching published journal stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};

// Advanced search for published journals
const advancedSearchPublishedJournals = async (req, res) => {
    try {
        const {
            search,
            year,
            quarter,
            author,
            keywords,
            status = 'published',
            page = 1,
            limit = 10
        } = req.query;

        const query = { status };

        // Text search
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { abstract: { $regex: search, $options: 'i' } },
                { keywords: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Year filter
        if (year) {
            query.volume_year = parseInt(year);
        }

        // Quarter filter
        if (quarter) {
            query.volume_quarter = parseInt(quarter);
        }

        // Author filter
        if (author) {
            query.authors = { $regex: author, $options: 'i' };
        }

        // Keywords filter
        if (keywords) {
            const keywordArray = keywords.split(',').map(k => k.trim());
            query.keywords = { $in: keywordArray.map(k => new RegExp(k, 'i')) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const journals = await PublishedJournal.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('submitted_by', 'name email');

        const total = await PublishedJournal.countDocuments(query);

        res.json({
            success: true,
            data: {
                journals,
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in advanced search:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search',
            error: error.message
        });
    }
};

// Get all journals for admin management
const getAllJournalsForAdmin = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            year,
            quarter,
            status
        } = req.query;

        const query = {};

        // Add filters
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { abstract: { $regex: search, $options: 'i' } },
                { authors: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (year) {
            query.volume_year = parseInt(year);
        }

        if (quarter) {
            query.volume_quarter = parseInt(quarter);
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const journals = await PublishedJournal.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('submitted_by', 'name email');

        const total = await PublishedJournal.countDocuments(query);

        res.json({
            success: true,
            data: {
                journals,
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        console.error('Error fetching journals for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching journals',
            error: error.message
        });
    }
};

// Admin direct upload with Cloudinary support for PDF and DOCX
const adminUploadJournal = async (req, res) => {
    try {
        console.log('=== ADMIN JOURNAL UPLOAD STARTED ===');
        console.log('Request body:', req.body);
        console.log('Uploaded files:', req.files);

        const {
            title,
            abstract,
            authors,
            keywords,
            volume_year,
            volume_quarter,
            submitted_by,
            status = 'published'
        } = req.body;

        // Validate required fields
        if (!title || !abstract || !authors) {
            return res.status(400).json({
                success: false,
                message: 'Title, abstract, and authors are required'
            });
        }

        // Parse JSON strings
        const parsedAuthors = typeof authors === 'string' ? JSON.parse(authors) : authors;
        const parsedKeywords = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;

        // Check if at least one file is uploaded
        if (!req.files || (!req.files.pdfFile && !req.files.docxFile)) {
            return res.status(400).json({
                success: false,
                message: 'Please upload at least one file (PDF or DOCX)'
            });
        }

        const journalData = {
            title,
            abstract,
            authors: parsedAuthors,
            keywords: parsedKeywords,
            volume_year: parseInt(volume_year),
            volume_quarter: parseInt(volume_quarter),
            submitted_by,
            status,
            publication_date: status === 'published' ? new Date() : null
        };

        // Handle PDF file upload to Cloudinary
        if (req.files.pdfFile) {
            const pdfFile = req.files.pdfFile;
            console.log('Processing PDF file:', pdfFile.name);

            try {
                // Create a clean public_id without special characters
                const cleanPdfFilename = pdfFile.name
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/\s+/g, '_')
                    .toLowerCase();

                const pdfUploadResult = await cloudinary.uploader.upload(pdfFile.tempFilePath, {
                    folder: `${process.env.CLOUDINARY_FOLDER || 'agricjournal'}/published-journals`,
                    resource_type: 'raw',
                    public_id: `${Date.now()}-${cleanPdfFilename}`,
                    use_filename: true,
                    unique_filename: false,
                    overwrite: true,
                    access_mode: 'public',
                    type: 'upload',
                    tags: ['published_journal_pdf']
                });

                journalData.pdfCloudinaryUrl = pdfUploadResult.secure_url;
                journalData.content_file_path = pdfFile.tempFilePath;
                console.log('PDF uploaded to Cloudinary:', pdfUploadResult.secure_url);
            } catch (pdfError) {
                console.error('Failed to upload PDF to Cloudinary:', pdfError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload PDF file to Cloudinary',
                    error: pdfError.message
                });
            }
        }

        // Handle DOCX file upload to Cloudinary
        if (req.files.docxFile) {
            const docxFile = req.files.docxFile;
            console.log('Processing DOCX file:', docxFile.name);

            try {
                // Create a clean public_id without special characters
                const cleanDocxFilename = docxFile.name
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/\s+/g, '_')
                    .toLowerCase();

                const docxUploadResult = await cloudinary.uploader.upload(docxFile.tempFilePath, {
                    folder: `${process.env.CLOUDINARY_FOLDER || 'agricjournal'}/published-journals`,
                    resource_type: 'raw',
                    public_id: `${Date.now()}-${cleanDocxFilename}`,
                    use_filename: true,
                    unique_filename: false,
                    overwrite: true,
                    access_mode: 'public',
                    type: 'upload',
                    tags: ['published_journal_docx']
                });

                journalData.docxCloudinaryUrl = docxUploadResult.secure_url;
                if (!journalData.content_file_path) {
                    journalData.content_file_path = docxFile.tempFilePath;
                }
                console.log('DOCX uploaded to Cloudinary:', docxUploadResult.secure_url);
            } catch (docxError) {
                console.error('Failed to upload DOCX to Cloudinary:', docxError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload DOCX file to Cloudinary',
                    error: docxError.message
                });
            }
        }

        const journal = new PublishedJournal(journalData);
        const savedJournal = await journal.save();

        console.log('=== ADMIN JOURNAL UPLOAD COMPLETED ===');

        res.status(201).json({
            success: true,
            message: 'Journal uploaded successfully to Cloudinary',
            data: { journal: savedJournal }
        });
    } catch (error) {
        console.error('Error in admin upload:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading journal',
            error: error.message
        });
    }
};

// Bulk delete journals
const bulkDeleteJournals = async (req, res) => {
    try {
        const { journalIds } = req.body;

        if (!journalIds || !Array.isArray(journalIds) || journalIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Journal IDs are required'
            });
        }

        const result = await PublishedJournal.deleteMany({
            _id: { $in: journalIds }
        });

        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} journal(s)`,
            data: { deletedCount: result.deletedCount }
        });
    } catch (error) {
        console.error('Error in bulk delete:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting journals',
            error: error.message
        });
    }
};

// Bulk archive journals
const bulkArchiveJournals = async (req, res) => {
    try {
        const { journalIds } = req.body;

        if (!journalIds || !Array.isArray(journalIds) || journalIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Journal IDs are required'
            });
        }

        const result = await PublishedJournal.updateMany(
            { _id: { $in: journalIds } },
            { status: 'archived', archived_date: new Date() }
        );

        res.json({
            success: true,
            message: `Successfully archived ${result.modifiedCount} journal(s)`,
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error('Error in bulk archive:', error);
        res.status(500).json({
            success: false,
            message: 'Error archiving journals',
            error: error.message
        });
    }
};

// Bulk publish journals
const bulkPublishJournals = async (req, res) => {
    try {
        const { journalIds } = req.body;

        if (!journalIds || !Array.isArray(journalIds) || journalIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Journal IDs are required'
            });
        }

        const result = await PublishedJournal.updateMany(
            { _id: { $in: journalIds } },
            { status: 'published', published_date: new Date() }
        );

        res.json({
            success: true,
            message: `Successfully published ${result.modifiedCount} journal(s)`,
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error('Error in bulk publish:', error);
        res.status(500).json({
            success: false,
            message: 'Error publishing journals',
            error: error.message
        });
    }
};

// Export journals
const exportJournals = async (req, res) => {
    try {
        const { journalIds, search, year, quarter, status } = req.query;

        const query = {};

        // If specific journal IDs are provided
        if (journalIds) {
            query._id = { $in: journalIds.split(',') };
        } else {
            // Apply filters for export all
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { abstract: { $regex: search, $options: 'i' } },
                    { authors: { $in: [new RegExp(search, 'i')] } }
                ];
            }

            if (year) {
                query.volume_year = parseInt(year);
            }

            if (quarter) {
                query.volume_quarter = parseInt(quarter);
            }

            if (status && status !== 'all') {
                query.status = status;
            }
        }

        const journals = await PublishedJournal.find(query)
            .sort({ createdAt: -1 })
            .populate('submitted_by', 'name email');

        // Create CSV content
        const csvHeaders = [
            'Title',
            'Authors',
            'Abstract',
            'Keywords',
            'Volume Year',
            'Volume Quarter',
            'Status',
            'Submitted By',
            'Created Date',
            'Published Date'
        ];

        const csvRows = journals.map(journal => [
            `"${journal.title || ''}"`,
            `"${journal.authors?.join(', ') || ''}"`,
            `"${journal.abstract?.substring(0, 100) || ''}..."`,
            `"${journal.keywords?.join(', ') || ''}"`,
            journal.volume_year || '',
            journal.volume_quarter || '',
            journal.status || '',
            journal.submitted_by?.name || journal.submitted_by || '',
            journal.createdAt ? new Date(journal.createdAt).toLocaleDateString() : '',
            journal.published_date ? new Date(journal.published_date).toLocaleDateString() : ''
        ]);

        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="journals-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error in export:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting journals',
            error: error.message
        });
    }
};

module.exports = {
    getAllPublishedJournals,
    getArchivedJournals,
    getJournalById,
    submitJournalForPublication,
    updateJournalStatus,
    deleteJournal,
    getJournalsByVolume,
    publishJournal,
    getPendingReview,
    upload,
    calculateVolume,
    downloadPublishedJournalPdf,
    downloadPublishedJournalDocx,
    directDownloadPublishedJournalPdf,
    directDownloadPublishedJournalDocx,
    getPublishedJournalStats,
    advancedSearchPublishedJournals,
    getAllJournalsForAdmin,
    adminUploadJournal,
    bulkDeleteJournals,
    bulkArchiveJournals,
    bulkPublishJournals,
    exportJournals
};
