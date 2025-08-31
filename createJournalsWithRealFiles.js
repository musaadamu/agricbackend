// Create sample journals with working download URLs
// Since we can't upload actual PDFs easily, we'll use existing Cloudinary files or create placeholder documents

function generateJournalsWithWorkingUrls() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate current quarter
    let currentQuarter;
    if (currentMonth >= 1 && currentMonth <= 3) currentQuarter = 1;
    else if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2;
    else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3;
    else currentQuarter = 4;

    // Using working Cloudinary URLs (we'll use the sample image as a placeholder)
    // In a real scenario, you would upload actual PDF files
    const workingCloudinaryUrl = "https://res.cloudinary.com/dv2rs4pwy/image/upload/v1/sample.jpg";
    
    // Alternative: Use some public PDF URLs for testing
    const publicPdfUrls = [
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "https://www.africau.edu/images/default/sample.pdf"
    ];

    const sampleJournals = [
        {
            title: "Sustainable Agricultural Practices in Sub-Saharan Africa: A Comprehensive Review",
            abstract: "This study examines the implementation and effectiveness of sustainable agricultural practices across Sub-Saharan Africa. Through a comprehensive analysis of farming techniques, crop rotation methods, and soil conservation strategies, we evaluate the impact of sustainable practices on crop yields, environmental preservation, and farmer livelihoods. Our research covers data from 15 countries over a 10-year period, analyzing both traditional and modern sustainable farming approaches. The findings reveal that integrated sustainable practices can increase crop yields by 25-40% while reducing environmental degradation. Key recommendations include the adoption of agroforestry systems, improved water management techniques, and the integration of indigenous knowledge with modern agricultural science.",
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
            content_file_path: publicPdfUrls[0],
            pdfCloudinaryUrl: publicPdfUrls[0],
            publication_date: new Date(),
            volume_year: currentYear,
            volume_quarter: currentQuarter,
            status: "published",
            submission_date: new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
            doi: `10.1234/agric.${currentYear}.${currentQuarter}.001`,
            page_numbers: "1-24",
            is_archived: false,
            file_size: 2048576,
            file_type: "application/pdf",
            submitted_by: "Dr. Amina Hassan",
            reviewed_by: "Editorial Board",
            review_date: new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000)), // 7 days ago
            review_notes: "Excellent research with comprehensive methodology. Approved for publication."
        },
        {
            title: "Climate Change Adaptation Strategies for Smallholder Farmers: Evidence from East Africa",
            abstract: "Climate change poses significant challenges to agricultural productivity, particularly for smallholder farmers in East Africa who depend on rain-fed agriculture. This research investigates various adaptation strategies employed by farmers in Kenya, Tanzania, and Uganda to cope with changing precipitation patterns, increased temperatures, and extreme weather events. Through surveys of 1,200 farmers and field experiments conducted over three growing seasons, we assess the effectiveness of different adaptation measures including drought-resistant crop varieties, water harvesting techniques, and diversified farming systems. Our findings indicate that farmers who adopted multiple adaptation strategies showed 35% higher resilience to climate shocks compared to those using traditional methods.",
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
            content_file_path: workingCloudinaryUrl,
            pdfCloudinaryUrl: workingCloudinaryUrl,
            publication_date: new Date(),
            volume_year: currentYear,
            volume_quarter: currentQuarter,
            status: "published",
            submission_date: new Date(currentDate.getTime() - (25 * 24 * 60 * 60 * 1000)), // 25 days ago
            doi: `10.1234/agric.${currentYear}.${currentQuarter}.002`,
            page_numbers: "25-48",
            is_archived: false,
            file_size: 120253, // Actual size of the sample image
            file_type: "image/jpeg", // Note: This is actually an image, not PDF
            submitted_by: "Dr. Grace Wanjiku",
            reviewed_by: "Editorial Board",
            review_date: new Date(currentDate.getTime() - (5 * 24 * 60 * 60 * 1000)), // 5 days ago
            review_notes: "Well-structured research with practical implications. Recommended for publication."
        }
    ];

    console.log('🚀 Sample Journal Data with Working Download URLs');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📚 Generated 2 sample journals with working download URLs\n');
    console.log('⚠️  Note: These use placeholder files for testing download functionality\n');
    
    sampleJournals.forEach((journal, index) => {
        console.log(`📖 Journal ${index + 1}: "${journal.title}"`);
        console.log(`🔗 Download URL: ${journal.pdfCloudinaryUrl}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(JSON.stringify(journal, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
    
    console.log('📋 Instructions for Manual Upload:');
    console.log('1. Go to MongoDB Atlas → Browse Collections');
    console.log('2. Select your database → publishedjournals collection');
    console.log('3. Click "Insert Document"');
    console.log('4. Copy and paste each journal document above');
    console.log('5. Click "Insert" for each document');
    console.log('6. Test the download functionality in your application\n');
    
    console.log('✅ These journals have working download URLs that you can test immediately!');
    console.log('🔗 Test URLs:');
    sampleJournals.forEach((journal, index) => {
        console.log(`   ${index + 1}. ${journal.pdfCloudinaryUrl}`);
    });
    
    console.log('\n💡 To use real PDF files:');
    console.log('1. Upload PDF files to your Cloudinary account');
    console.log('2. Use the raw upload URL format: https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/filename.pdf');
    console.log('3. Replace the URLs in the journal documents above');
}

// Run the generator
generateJournalsWithWorkingUrls();
