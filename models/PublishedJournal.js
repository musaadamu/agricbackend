const mongoose = require('mongoose');

// Helper function to calculate volume from date
function calculateVolume(date) {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    let quarter;
    if (month >= 1 && month <= 3) quarter = 1;
    else if (month >= 4 && month <= 6) quarter = 2;
    else if (month >= 7 && month <= 9) quarter = 3;
    else quarter = 4;
    
    return { year, quarter };
}

const PublishedJournalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [500, 'Title cannot exceed 500 characters']
    },
    abstract: {
        type: String,
        required: [true, 'Abstract is required'],
        maxlength: [5000, 'Abstract cannot exceed 5000 characters']
    },
    authors: [{
        type: String,
        required: true,
        trim: true
    }],
    keywords: [{
        type: String,
        trim: true
    }],
    content_file_path: {
        type: String,
        required: [true, 'Content file is required']
    },
    // Cloudinary URLs for files
    docxCloudinaryUrl: { type: String },
    pdfCloudinaryUrl: { type: String },
    
    publication_date: {
        type: Date,
        default: null
    },
    volume_year: {
        type: Number,
        required: true
    },
    volume_quarter: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'accepted', 'published', 'rejected'],
        default: 'submitted',
        required: true
    },
    submission_date: {
        type: Date,
        default: Date.now,
        required: true
    },
    review_notes: {
        type: String,
        maxlength: [2000, 'Review notes cannot exceed 2000 characters']
    },
    doi: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values
        trim: true
    },
    page_numbers: {
        type: String,
        trim: true
    },
    is_archived: {
        type: Boolean,
        default: false
    },
    // Additional metadata
    file_size: {
        type: Number
    },
    file_type: {
        type: String
    },
    submitted_by: {
        type: String,
        trim: true
    },
    reviewed_by: {
        type: String,
        trim: true
    },
    review_date: {
        type: Date
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for volume display
PublishedJournalSchema.virtual('volume_display').get(function() {
    return `${this.volume_year} - Quarter ${this.volume_quarter}`;
});

// Virtual for formatted authors
PublishedJournalSchema.virtual('authors_display').get(function() {
    if (this.authors && this.authors.length > 0) {
        return this.authors.join(', ');
    }
    return '';
});

// Pre-save middleware to auto-calculate volume
PublishedJournalSchema.pre('save', function(next) {
    // Calculate volume from submission date if not already set
    if (!this.volume_year || !this.volume_quarter) {
        const dateToUse = this.publication_date || this.submission_date || new Date();
        const volume = calculateVolume(dateToUse);
        this.volume_year = volume.year;
        this.volume_quarter = volume.quarter;
    }
    
    // Generate DOI if status is published and DOI doesn't exist
    if (this.status === 'published' && !this.doi) {
        const year = this.volume_year;
        const quarter = this.volume_quarter;
        const timestamp = Date.now();
        this.doi = `10.1234/agricjournal.${year}.${quarter}.${timestamp}`;
    }
    
    // Set publication date when status changes to published
    if (this.status === 'published' && !this.publication_date) {
        this.publication_date = new Date();
    }
    
    next();
});

// Indexes for performance
PublishedJournalSchema.index({ volume_year: 1, volume_quarter: 1 });
PublishedJournalSchema.index({ publication_date: -1 });
PublishedJournalSchema.index({ status: 1 });
PublishedJournalSchema.index({ is_archived: 1 });
PublishedJournalSchema.index({ submission_date: -1 });
PublishedJournalSchema.index({ title: 'text', abstract: 'text', authors: 'text' });

// Static methods
PublishedJournalSchema.statics.getByVolume = function(year, quarter) {
    return this.find({
        volume_year: year,
        volume_quarter: quarter,
        status: 'published'
    }).sort({ publication_date: -1 });
};

PublishedJournalSchema.statics.getCurrentYearJournals = function() {
    const currentYear = new Date().getFullYear();
    return this.find({
        volume_year: currentYear,
        status: 'published',
        is_archived: false
    }).sort({ volume_quarter: 1, publication_date: -1 });
};

PublishedJournalSchema.statics.getArchivedByYear = function(year) {
    return this.find({
        volume_year: year,
        is_archived: true,
        status: 'published'
    }).sort({ volume_quarter: 1, publication_date: -1 });
};

PublishedJournalSchema.statics.getPendingReview = function() {
    return this.find({
        status: { $in: ['submitted', 'under_review'] }
    }).sort({ submission_date: 1 });
};

module.exports = mongoose.model('PublishedJournal', PublishedJournalSchema);
