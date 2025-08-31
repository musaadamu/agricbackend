const mongoose = require('mongoose');
require('dotenv').config();

// Import the PublishedJournal model
const PublishedJournal = require('../models/PublishedJournal');

// Sample journal data
const sampleJournals = [
    {
        title: "Sustainable Agricultural Practices in Sub-Saharan Africa: A Comprehensive Review",
        abstract: "This study examines the implementation and effectiveness of sustainable agricultural practices across Sub-Saharan Africa. Through a comprehensive analysis of farming techniques, crop rotation methods, and soil conservation strategies, we evaluate the impact of sustainable practices on crop yields, environmental preservation, and farmer livelihoods. Our research covers data from 15 countries over a 10-year period, analyzing both traditional and modern sustainable farming approaches. The findings reveal that integrated sustainable practices can increase crop yields by 25-40% while reducing environmental degradation. Key recommendations include the adoption of agroforestry systems, improved water management techniques, and the integration of indigenous knowledge with modern agricultural science. This research provides valuable insights for policymakers, agricultural extension services, and farmers seeking to implement sustainable practices that ensure food security while protecting natural resources.",
        authors: [
            "Dr. Amina Hassan",
            "Prof. John Okafor", 
            "Dr. Sarah Mwangi",
            "Dr. Ibrahim Diallo"
        ],
        keywords: [
            "sustainable agriculture",
            "Sub-Saharan Africa",
            "crop yields",
            "soil conservation",
            "agroforestry",
            "food security",
            "environmental preservation"
        ],
        content_file_path: "https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/sample_journal_1.pdf",
        pdfCloudinaryUrl: "https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/sample_journal_1.pdf",
        status: "published",
        submitted_by: "Dr. Amina Hassan",
        page_numbers: "1-24",
        file_size: 2048576, // 2MB
        file_type: "application/pdf"
    },
    {
        title: "Climate Change Adaptation Strategies for Smallholder Farmers: Evidence from East Africa",
        abstract: "Climate change poses significant challenges to agricultural productivity, particularly for smallholder farmers in East Africa who depend on rain-fed agriculture. This research investigates various adaptation strategies employed by farmers in Kenya, Tanzania, and Uganda to cope with changing precipitation patterns, increased temperatures, and extreme weather events. Through surveys of 1,200 farmers and field experiments conducted over three growing seasons, we assess the effectiveness of different adaptation measures including drought-resistant crop varieties, water harvesting techniques, and diversified farming systems. Our findings indicate that farmers who adopted multiple adaptation strategies showed 35% higher resilience to climate shocks compared to those using traditional methods. The study also examines the role of agricultural extension services, farmer cooperatives, and government policies in facilitating adaptation. We recommend a multi-faceted approach that combines technological innovations, traditional knowledge, and supportive institutional frameworks to enhance climate resilience in smallholder farming systems.",
        authors: [
            "Dr. Grace Wanjiku",
            "Prof. Michael Ssebunya",
            "Dr. James Mwenda",
            "Dr. Fatuma Ali"
        ],
        keywords: [
            "climate change",
            "adaptation strategies",
            "smallholder farmers",
            "East Africa",
            "drought resistance",
            "water harvesting",
            "agricultural resilience",
            "food security"
        ],
        content_file_path: "https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/sample_journal_2.pdf",
        pdfCloudinaryUrl: "https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/sample_journal_2.pdf",
        status: "published",
        submitted_by: "Dr. Grace Wanjiku",
        page_numbers: "25-48",
        file_size: 3145728, // 3MB
        file_type: "application/pdf"
    }
];

async function uploadTestJournals() {
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        console.log('📚 Uploading test journals...\n');

        for (let i = 0; i < sampleJournals.length; i++) {
            const journalData = sampleJournals[i];
            
            console.log(`📖 Processing Journal ${i + 1}: "${journalData.title}"`);
            
            // Check if journal already exists
            const existingJournal = await PublishedJournal.findOne({ 
                title: journalData.title 
            });
            
            if (existingJournal) {
                console.log(`⚠️  Journal "${journalData.title}" already exists. Skipping...`);
                continue;
            }

            // Create new journal
            const journal = new PublishedJournal(journalData);
            const savedJournal = await journal.save();
            
            console.log(`✅ Successfully uploaded: "${savedJournal.title}"`);
            console.log(`   - ID: ${savedJournal._id}`);
            console.log(`   - Volume: ${savedJournal.volume_year} - Q${savedJournal.volume_quarter}`);
            console.log(`   - DOI: ${savedJournal.doi}`);
            console.log(`   - Status: ${savedJournal.status}`);
            console.log(`   - Authors: ${savedJournal.authors.join(', ')}`);
            console.log(`   - Keywords: ${savedJournal.keywords.slice(0, 3).join(', ')}${savedJournal.keywords.length > 3 ? '...' : ''}`);
            console.log('');
        }

        // Get summary statistics
        const totalJournals = await PublishedJournal.countDocuments();
        const publishedJournals = await PublishedJournal.countDocuments({ status: 'published' });
        const currentYear = new Date().getFullYear();
        const currentYearJournals = await PublishedJournal.countDocuments({ 
            volume_year: currentYear 
        });

        console.log('📊 Upload Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📚 Total journals in database: ${totalJournals}`);
        console.log(`✅ Published journals: ${publishedJournals}`);
        console.log(`📅 Current year (${currentYear}) journals: ${currentYearJournals}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        console.log('\n🎉 Test journals uploaded successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Start your backend server: npm start');
        console.log('2. Visit the published journals page: /published-journals');
        console.log('3. Test the search and filtering functionality');
        console.log('4. Try downloading the sample journals');

    } catch (error) {
        console.error('❌ Error uploading test journals:', error.message);
        
        if (error.message.includes('Authentication failed') || error.code === 8000) {
            console.error('💡 Database authentication failed. Please check:');
            console.error('   - Your MongoDB Atlas username and password');
            console.error('   - Network access settings in MongoDB Atlas');
            console.error('   - Database connection string in .env file');
        }
        
        if (error.name === 'ValidationError') {
            console.error('💡 Validation errors:');
            Object.keys(error.errors).forEach(key => {
                console.error(`   - ${key}: ${error.errors[key].message}`);
            });
        }
    } finally {
        // Close the database connection
        console.log('\n🔌 Closing database connection...');
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    }
}

// Run the script
console.log('🚀 Starting test journal upload script...');
console.log('═══════════════════════════════════════════════════════════════\n');

uploadTestJournals();
