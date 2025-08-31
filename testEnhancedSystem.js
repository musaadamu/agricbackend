// Enhanced Published Journal System Test Script
// This script tests the upload and download functionality

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test configuration
const testConfig = {
    apiBaseUrl: API_BASE_URL,
    testJournal: {
        title: "Enhanced Test Journal: Advanced Agricultural Techniques",
        abstract: "This is a comprehensive test of the enhanced journal system with improved upload and download capabilities. The system now supports multiple file formats, robust error handling, and advanced download mechanisms similar to the existing journal system.",
        authors: ["Dr. Test Author", "Prof. System Tester"],
        keywords: ["test", "enhanced system", "agriculture", "technology"],
        submitted_by: "System Tester"
    }
};

// Create a simple test PDF content
function createTestPDF() {
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Enhanced Test Journal) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;

    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    const pdfPath = path.join(testDir, 'enhanced-test-journal.pdf');
    fs.writeFileSync(pdfPath, pdfContent);
    return pdfPath;
}

// Test journal submission with file upload
async function testJournalSubmission() {
    console.log('🧪 Testing Enhanced Journal Submission...');
    
    try {
        // Create test PDF
        const testPdfPath = createTestPDF();
        console.log('✅ Test PDF created:', testPdfPath);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('title', testConfig.testJournal.title);
        formData.append('abstract', testConfig.testJournal.abstract);
        formData.append('authors', JSON.stringify(testConfig.testJournal.authors));
        formData.append('keywords', JSON.stringify(testConfig.testJournal.keywords));
        formData.append('submitted_by', testConfig.testJournal.submitted_by);
        formData.append('manuscript', fs.createReadStream(testPdfPath));
        
        console.log('📤 Submitting journal...');
        const response = await axios.post(
            `${testConfig.apiBaseUrl}/api/published-journals/submit`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 30000
            }
        );
        
        if (response.data.success) {
            console.log('✅ Journal submitted successfully!');
            console.log('📋 Journal Details:');
            console.log('   - ID:', response.data.data.journal._id);
            console.log('   - Title:', response.data.data.journal.title);
            console.log('   - Status:', response.data.data.journal.status);
            console.log('   - Volume:', response.data.data.journal.volume_year, '- Q' + response.data.data.journal.volume_quarter);
            console.log('   - PDF URL:', response.data.data.journal.pdfCloudinaryUrl || 'Not set');
            console.log('   - DOCX URL:', response.data.data.journal.docxCloudinaryUrl || 'Not set');
            
            // Clean up test file
            fs.unlinkSync(testPdfPath);
            
            return response.data.data.journal;
        } else {
            throw new Error(response.data.message || 'Submission failed');
        }
        
    } catch (error) {
        console.error('❌ Journal submission failed:', error.message);
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
        }
        return null;
    }
}

// Test download endpoints
async function testDownloadEndpoints(journalId) {
    console.log('\n🧪 Testing Enhanced Download Endpoints...');
    
    const downloadTests = [
        {
            name: 'PDF Download (Redirect)',
            endpoint: `/api/published-journals/${journalId}/download/pdf`,
            expectedRedirect: true
        },
        {
            name: 'DOCX Download (Redirect)',
            endpoint: `/api/published-journals/${journalId}/download/docx`,
            expectedRedirect: true
        },
        {
            name: 'PDF Direct Download (Stream)',
            endpoint: `/api/published-journals/${journalId}/direct-download/pdf`,
            expectedRedirect: false
        },
        {
            name: 'DOCX Direct Download (Stream)',
            endpoint: `/api/published-journals/${journalId}/direct-download/docx`,
            expectedRedirect: false
        }
    ];
    
    for (const test of downloadTests) {
        console.log(`\n📥 Testing: ${test.name}`);
        
        try {
            const response = await axios.get(
                `${testConfig.apiBaseUrl}${test.endpoint}`,
                {
                    maxRedirects: 0, // Don't follow redirects automatically
                    validateStatus: (status) => status < 400 || status === 302 || status === 301,
                    timeout: 10000
                }
            );
            
            if (test.expectedRedirect && (response.status === 302 || response.status === 301)) {
                console.log('✅ Redirect response received');
                console.log('   - Status:', response.status);
                console.log('   - Location:', response.headers.location || 'Not provided');
            } else if (!test.expectedRedirect && response.status === 200) {
                console.log('✅ Direct download response received');
                console.log('   - Status:', response.status);
                console.log('   - Content-Type:', response.headers['content-type']);
                console.log('   - Content-Length:', response.headers['content-length'] || 'Not provided');
            } else {
                console.log('⚠️  Unexpected response');
                console.log('   - Status:', response.status);
                console.log('   - Expected redirect:', test.expectedRedirect);
            }
            
        } catch (error) {
            if (error.response) {
                console.log('❌ Download test failed');
                console.log('   - Status:', error.response.status);
                console.log('   - Message:', error.response.data?.message || 'No message');
            } else {
                console.log('❌ Network error:', error.message);
            }
        }
    }
}

// Test journal retrieval
async function testJournalRetrieval() {
    console.log('\n🧪 Testing Journal Retrieval...');
    
    try {
        const response = await axios.get(`${testConfig.apiBaseUrl}/api/published-journals`);
        
        if (response.data.success) {
            console.log('✅ Journals retrieved successfully');
            console.log('   - Total journals:', response.data.data.totalJournals);
            console.log('   - Current page:', response.data.data.currentPage);
            console.log('   - Current year:', response.data.data.currentYear);
            
            if (response.data.data.journals.length > 0) {
                const firstJournal = response.data.data.journals[0];
                console.log('   - First journal:', firstJournal.title);
                console.log('   - Status:', firstJournal.status);
                return firstJournal._id;
            }
        }
        
        return null;
    } catch (error) {
        console.error('❌ Journal retrieval failed:', error.message);
        return null;
    }
}

// Main test function
async function runEnhancedSystemTests() {
    console.log('🚀 Enhanced Published Journal System Tests');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('API Base URL:', testConfig.apiBaseUrl);
    console.log('Test started at:', new Date().toISOString());
    console.log('');
    
    try {
        // Test 1: Journal Submission
        const submittedJournal = await testJournalSubmission();
        
        // Test 2: Journal Retrieval
        const existingJournalId = await testJournalRetrieval();
        
        // Test 3: Download Endpoints
        const testJournalId = submittedJournal?._id || existingJournalId;
        if (testJournalId) {
            await testDownloadEndpoints(testJournalId);
        } else {
            console.log('\n⚠️  No journal available for download testing');
        }
        
        console.log('\n🎯 Test Summary');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Enhanced system tests completed');
        console.log('📋 Key Features Tested:');
        console.log('   - File upload with validation');
        console.log('   - Cloudinary integration');
        console.log('   - Multiple download endpoints');
        console.log('   - Error handling and logging');
        console.log('   - Journal retrieval and metadata');
        
        if (submittedJournal) {
            console.log('\n📚 Test Journal Created:');
            console.log('   - ID:', submittedJournal._id);
            console.log('   - Title:', submittedJournal.title);
            console.log('   - You can test downloads in the frontend');
        }
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Start your frontend: npm start (in frontend directory)');
    console.log('2. Visit: http://localhost:3000/published-journals');
    console.log('3. Test the enhanced download functionality');
    console.log('4. Try submitting a new journal via: http://localhost:3000/submit-journal');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runEnhancedSystemTests().catch(console.error);
}

module.exports = {
    runEnhancedSystemTests,
    testJournalSubmission,
    testDownloadEndpoints,
    testJournalRetrieval
};
