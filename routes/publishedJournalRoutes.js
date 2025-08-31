const express = require('express');
const router = express.Router();
const {
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
    downloadPublishedJournalPdf,
    downloadPublishedJournalDocx,
    directDownloadPublishedJournalPdf,
    directDownloadPublishedJournalDocx
} = require('../controllers/publishedJournalController');

// Middleware for authentication (you can implement this based on your auth system)
const authenticateUser = (req, res, next) => {
    // For now, we'll skip authentication - implement based on your existing auth
    next();
};

const authenticateAdmin = (req, res, next) => {
    // For now, we'll skip admin authentication - implement based on your existing auth
    next();
};

// Public routes - no authentication required

// GET /api/published-journals - Get all published journals (current year only)
router.get('/', getAllPublishedJournals);

// GET /api/published-journals/archive/:year - Get archived journals by year
router.get('/archive/:year', getArchivedJournals);

// GET /api/published-journals/volume/:year/:quarter - Get journals by volume
router.get('/volume/:year/:quarter', getJournalsByVolume);

// GET /api/published-journals/:id - Get single published journal
router.get('/:id', getJournalById);

// Download routes for published journals
router.get('/:id/download/pdf', downloadPublishedJournalPdf);
router.get('/:id/download/docx', downloadPublishedJournalDocx);
router.get('/:id/direct-download/pdf', directDownloadPublishedJournalPdf);
router.get('/:id/direct-download/docx', directDownloadPublishedJournalDocx);

// Protected routes - require authentication

// POST /api/published-journals/submit - Submit journal for publication
router.post('/submit', authenticateUser, upload.single('manuscript'), submitJournalForPublication);

// Admin routes - require admin authentication

// GET /api/published-journals/pending - Get journals pending review
router.get('/admin/pending', authenticateAdmin, getPendingReview);

// PUT /api/published-journals/:id - Update journal status/details
router.put('/:id', authenticateAdmin, updateJournalStatus);

// POST /api/published-journals/publish/:id - Publish a journal
router.post('/publish/:id', authenticateAdmin, publishJournal);

// DELETE /api/published-journals/:id - Delete journal
router.delete('/:id', authenticateAdmin, deleteJournal);

// Additional utility routes

// GET /api/published-journals/stats/overview - Get publication statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const PublishedJournal = require('../models/PublishedJournal');
        const currentYear = new Date().getFullYear();
        
        // Get current year statistics
        const currentYearStats = await PublishedJournal.aggregate([
            { $match: { volume_year: currentYear } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get quarterly breakdown for current year
        const quarterlyStats = await PublishedJournal.aggregate([
            { 
                $match: { 
                    volume_year: currentYear,
                    status: 'published'
                }
            },
            {
                $group: {
                    _id: '$volume_quarter',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Get total published journals
        const totalPublished = await PublishedJournal.countDocuments({ status: 'published' });
        
        // Get available years for archive
        const availableYears = await PublishedJournal.distinct('volume_year', { status: 'published' });
        
        res.json({
            success: true,
            data: {
                currentYear,
                currentYearStats,
                quarterlyStats,
                totalPublished,
                availableYears: availableYears.sort((a, b) => b - a)
            },
            message: 'Statistics retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
});

// GET /api/published-journals/search - Advanced search
router.get('/search/advanced', async (req, res) => {
    try {
        const PublishedJournal = require('../models/PublishedJournal');
        const { 
            query, 
            year, 
            quarter, 
            status = 'published',
            page = 1, 
            limit = 10 
        } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let searchQuery = { status };
        
        // Add text search if query provided
        if (query) {
            searchQuery.$text = { $search: query };
        }
        
        // Add year filter
        if (year) {
            searchQuery.volume_year = parseInt(year);
        }
        
        // Add quarter filter
        if (quarter) {
            searchQuery.volume_quarter = parseInt(quarter);
        }
        
        const journals = await PublishedJournal.find(searchQuery)
            .sort({ publication_date: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const totalJournals = await PublishedJournal.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalJournals / parseInt(limit));
        
        res.json({
            success: true,
            data: {
                journals,
                currentPage: parseInt(page),
                totalPages,
                totalJournals,
                searchQuery: req.query
            },
            message: 'Search completed successfully'
        });
        
    } catch (error) {
        console.error('Error in advanced search:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing search',
            error: error.message
        });
    }
});

// POST /api/published-journals/bulk-update - Bulk update journals
router.post('/bulk-update', authenticateAdmin, async (req, res) => {
    try {
        const PublishedJournal = require('../models/PublishedJournal');
        const { journalIds, updateData } = req.body;
        
        if (!journalIds || !Array.isArray(journalIds) || journalIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Journal IDs array is required'
            });
        }
        
        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Update data is required'
            });
        }
        
        // Add review date if status is being updated
        if (updateData.status) {
            updateData.review_date = new Date();
        }
        
        const result = await PublishedJournal.updateMany(
            { _id: { $in: journalIds } },
            { $set: updateData }
        );
        
        res.json({
            success: true,
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            },
            message: `${result.modifiedCount} journals updated successfully`
        });
        
    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing bulk update',
            error: error.message
        });
    }
});

module.exports = router;
