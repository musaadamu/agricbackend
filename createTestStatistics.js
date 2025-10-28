// Script to create test data for published journal statistics
const mongoose = require('mongoose');
require('dotenv').config();

// Published Journal model
const publishedJournalSchema = new mongoose.Schema({
    title: { type: String, required: true },
    abstract: { type: String, required: true },
    authors: [{ type: String, required: true }],
    keywords: [{ type: String }],
    volume_year: { type: Number, required: true },
    volume_quarter: { type: Number, required: true, min: 1, max: 4 },
    status: { 
        type: String, 
        enum: ['submitted', 'under_review', 'published', 'rejected', 'archived'], 
        default: 'submitted' 
    },
    submitted_by: { type: String },
    manuscript_url: { type: String },
    manuscript_filename: { type: String },
    downloadCount: { type: Number, default: 0 },
    published_date: { type: Date },
    archived_date: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const PublishedJournal = mongoose.model('PublishedJournal', publishedJournalSchema);

// Sample data for testing
const sampleJournals = [
    // 2024 Data
    {
        title: "Sustainable Agricultural Practices in Nigeria: A Comprehensive Study",
        abstract: "This study examines sustainable agricultural practices across different regions of Nigeria, focusing on crop rotation, organic farming, and water conservation techniques.",
        authors: ["Dr. Adamu Musa", "Prof. Fatima Ibrahim", "Dr. John Okafor"],
        keywords: ["sustainable agriculture", "Nigeria", "crop rotation", "organic farming"],
        volume_year: 2024,
        volume_quarter: 1,
        status: "published",
        submitted_by: "Dr. Adamu Musa",
        downloadCount: 245,
        published_date: new Date('2024-03-15'),
        createdAt: new Date('2024-01-10')
    },
    {
        title: "Digital Marketing Strategies for Small Businesses in West Africa",
        abstract: "An analysis of effective digital marketing strategies that small businesses in West Africa can implement to increase their market reach and customer engagement.",
        authors: ["Dr. Sarah Johnson", "Prof. Ahmed Hassan"],
        keywords: ["digital marketing", "small business", "West Africa", "customer engagement"],
        volume_year: 2024,
        volume_quarter: 1,
        status: "published",
        submitted_by: "Dr. Sarah Johnson",
        downloadCount: 189,
        published_date: new Date('2024-02-20'),
        createdAt: new Date('2024-01-05')
    },
    {
        title: "Entrepreneurship Education and Youth Employment in Nigeria",
        abstract: "This research explores the relationship between entrepreneurship education programs and youth employment rates in Nigeria.",
        authors: ["Prof. Michael Adebayo", "Dr. Grace Okoro", "Dr. Ibrahim Suleiman"],
        keywords: ["entrepreneurship", "education", "youth employment", "Nigeria"],
        volume_year: 2024,
        volume_quarter: 2,
        status: "published",
        submitted_by: "Prof. Michael Adebayo",
        downloadCount: 312,
        published_date: new Date('2024-06-10'),
        createdAt: new Date('2024-04-15')
    },
    {
        title: "Climate Change Impact on Agricultural Productivity",
        abstract: "A comprehensive analysis of how climate change affects agricultural productivity in sub-Saharan Africa.",
        authors: ["Dr. Elizabeth Nwosu", "Prof. David Ogundimu"],
        keywords: ["climate change", "agriculture", "productivity", "sub-Saharan Africa"],
        volume_year: 2024,
        volume_quarter: 2,
        status: "published",
        submitted_by: "Dr. Elizabeth Nwosu",
        downloadCount: 278,
        published_date: new Date('2024-05-25'),
        createdAt: new Date('2024-04-01')
    },
    {
        title: "Financial Inclusion and Mobile Banking in Rural Areas",
        abstract: "Examining the role of mobile banking in promoting financial inclusion among rural populations in Nigeria.",
        authors: ["Dr. Kemi Adeyemi", "Prof. Usman Garba"],
        keywords: ["financial inclusion", "mobile banking", "rural areas", "Nigeria"],
        volume_year: 2024,
        volume_quarter: 3,
        status: "published",
        submitted_by: "Dr. Kemi Adeyemi",
        downloadCount: 156,
        published_date: new Date('2024-09-12'),
        createdAt: new Date('2024-07-20')
    },
    
    // 2023 Data
    {
        title: "Innovation in Agricultural Technology: A Nigerian Perspective",
        abstract: "This study explores innovative agricultural technologies and their adoption rates among Nigerian farmers.",
        authors: ["Prof. Aliyu Mohammed", "Dr. Blessing Eze"],
        keywords: ["innovation", "agricultural technology", "Nigeria", "farmers"],
        volume_year: 2023,
        volume_quarter: 4,
        status: "published",
        submitted_by: "Prof. Aliyu Mohammed",
        downloadCount: 423,
        published_date: new Date('2023-12-05'),
        createdAt: new Date('2023-10-15')
    },
    {
        title: "E-commerce Growth and Consumer Behavior in Nigeria",
        abstract: "An analysis of e-commerce growth trends and changing consumer behavior patterns in Nigeria's digital marketplace.",
        authors: ["Dr. Chioma Okafor", "Prof. Tunde Adebisi"],
        keywords: ["e-commerce", "consumer behavior", "Nigeria", "digital marketplace"],
        volume_year: 2023,
        volume_quarter: 3,
        status: "published",
        submitted_by: "Dr. Chioma Okafor",
        downloadCount: 367,
        published_date: new Date('2023-09-18'),
        createdAt: new Date('2023-07-10')
    },
    
    // Pending submissions for testing
    {
        title: "Blockchain Technology in Supply Chain Management",
        abstract: "Exploring the potential of blockchain technology to improve supply chain transparency and efficiency in Nigeria.",
        authors: ["Dr. Emeka Okonkwo"],
        keywords: ["blockchain", "supply chain", "transparency", "Nigeria"],
        volume_year: 2024,
        volume_quarter: 4,
        status: "under_review",
        submitted_by: "Dr. Emeka Okonkwo",
        downloadCount: 0,
        createdAt: new Date('2024-10-01')
    },
    {
        title: "Women Entrepreneurship in Northern Nigeria",
        abstract: "A study on the challenges and opportunities facing women entrepreneurs in Northern Nigeria.",
        authors: ["Dr. Aisha Bello", "Prof. Zainab Umar"],
        keywords: ["women entrepreneurship", "Northern Nigeria", "challenges", "opportunities"],
        volume_year: 2024,
        volume_quarter: 4,
        status: "submitted",
        submitted_by: "Dr. Aisha Bello",
        downloadCount: 0,
        createdAt: new Date('2024-11-15')
    }
];

async function createTestData() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️ Clearing existing published journals...');
        await PublishedJournal.deleteMany({});

        // Insert sample data
        console.log('📝 Creating test journals...');
        const createdJournals = await PublishedJournal.insertMany(sampleJournals);
        
        console.log(`✅ Created ${createdJournals.length} test journals`);
        
        // Display statistics
        const stats = await PublishedJournal.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        console.log('\n📊 Test Data Statistics:');
        stats.forEach(stat => {
            console.log(`   - ${stat._id}: ${stat.count} journals`);
        });
        
        const totalDownloads = await PublishedJournal.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$downloadCount' }
                }
            }
        ]);
        
        console.log(`   - Total Downloads: ${totalDownloads[0]?.total || 0}`);
        
        const uniqueAuthors = await PublishedJournal.aggregate([
            { $unwind: '$authors' },
            { $group: { _id: '$authors' } },
            { $count: 'total' }
        ]);
        
        console.log(`   - Unique Authors: ${uniqueAuthors[0]?.total || 0}`);
        
        console.log('\n🎉 Test data created successfully!');
        console.log('📈 You can now test the statistics page with real data.');
        
    } catch (error) {
        console.error('❌ Error creating test data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
createTestData().catch(console.error);
