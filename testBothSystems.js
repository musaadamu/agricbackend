// Comprehensive Test Script for Both Journal Systems
// Tests upload and download functionality for both existing and published journal systems

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test configuration
const testConfig = {
    apiBaseUrl: API_BASE_URL,
    testFiles: {
        pdf: null,
        docx: null
    },
    results: {
        existingSystem: {},
        publishedSystem: {}
    }
};

// Create test files
function createTestFiles() {
    console.log('📁 Creating test files...');
    
    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a simple PDF
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
/Length 50
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Journal System Comparison) Tj
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
320
%%EOF`;

    // Create a simple DOCX (minimal structure)
    const docxContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00!\x00Test DOCX Content for Journal System Testing`;
    
    const pdfPath = path.join(testDir, 'test-journal.pdf');
    const docxPath = path.join(testDir, 'test-journal.docx');
    
    fs.writeFileSync(pdfPath, pdfContent);
    fs.writeFileSync(docxPath, docxContent);
    
    testConfig.testFiles.pdf = pdfPath;
    testConfig.testFiles.docx = docxPath;
    
    console.log('✅ Test files created:');
    console.log('   - PDF:', pdfPath);
    console.log('   - DOCX:', docxPath);
}

// Test existing journal system upload
async function testExistingSystemUpload() {
    console.log('\n🧪 Testing Existing Journal System Upload...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const formData = new FormData();
        formData.append('title', 'Test Journal - Existing System');
        formData.append('abstract', 'This is a test journal for the existing journal system upload functionality.');
        formData.append('authors', 'Test Author, System Tester');
        formData.append('keywords', 'test, existing system, journal');
        formData.append('pdfFile', fs.createReadStream(testConfig.testFiles.pdf));
        formData.append('docxFile', fs.createReadStream(testConfig.testFiles.docx));
        
        console.log('📤 Uploading to existing system...');
        const response = await axios.post(
            `${testConfig.apiBaseUrl}/api/journals`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 30000
            }
        );
        
        if (response.data) {
            console.log('✅ Existing system upload successful!');
            console.log('📋 Response:', {
                status: response.status,
                journalId: response.data._id || response.data.id,
                title: response.data.title,
                pdfUrl: response.data.pdfCloudinaryUrl || 'Not provided',
                docxUrl: response.data.docxCloudinaryUrl || 'Not provided'
            });
            
            testConfig.results.existingSystem = {
                success: true,
                journalId: response.data._id || response.data.id,
                data: response.data
            };
        }
        
    } catch (error) {
        console.error('❌ Existing system upload failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        testConfig.results.existingSystem = {
            success: false,
            error: error.message
        };
    }
}

// Test published journal system upload
async function testPublishedSystemUpload() {
    console.log('\n🧪 Testing Published Journal System Upload...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const formData = new FormData();
        formData.append('title', 'Test Journal - Published System');
        formData.append('abstract', 'This is a test journal for the enhanced published journal system upload functionality with advanced features.');
        formData.append('authors', JSON.stringify(['Dr. Test Author', 'Prof. System Tester']));
        formData.append('keywords', JSON.stringify(['test', 'published system', 'enhanced features']));
        formData.append('submitted_by', 'System Tester');
        formData.append('manuscript', fs.createReadStream(testConfig.testFiles.pdf));
        
        console.log('📤 Uploading to published system...');
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
            console.log('✅ Published system upload successful!');
            console.log('📋 Response:', {
                status: response.status,
                journalId: response.data.data.journal._id,
                title: response.data.data.journal.title,
                volume: `${response.data.data.journal.volume_year} - Q${response.data.data.journal.volume_quarter}`,
                doi: response.data.data.journal.doi,
                pdfUrl: response.data.data.journal.pdfCloudinaryUrl || 'Not provided'
            });
            
            testConfig.results.publishedSystem = {
                success: true,
                journalId: response.data.data.journal._id,
                data: response.data.data.journal
            };
        }
        
    } catch (error) {
        console.error('❌ Published system upload failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        testConfig.results.publishedSystem = {
            success: false,
            error: error.message
        };
    }
}

// Test existing system downloads
async function testExistingSystemDownloads(journalId) {
    console.log('\n🧪 Testing Existing System Downloads...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const downloadTests = [
        {
            name: 'PDF Download',
            endpoint: `/api/journals/${journalId}/download/pdf`
        },
        {
            name: 'DOCX Download',
            endpoint: `/api/journals/${journalId}/download/docx`
        },
        {
            name: 'PDF Direct Download',
            endpoint: `/api/journals/${journalId}/direct-download/pdf`
        },
        {
            name: 'DOCX Direct Download',
            endpoint: `/api/journals/${journalId}/direct-download/docx`
        }
    ];
    
    for (const test of downloadTests) {
        console.log(`\n📥 Testing: ${test.name}`);
        
        try {
            const response = await axios.get(
                `${testConfig.apiBaseUrl}${test.endpoint}`,
                {
                    maxRedirects: 0,
                    validateStatus: (status) => status < 400 || status === 302 || status === 301,
                    timeout: 10000
                }
            );
            
            console.log('✅ Download endpoint accessible');
            console.log('   - Status:', response.status);
            console.log('   - Headers:', {
                'content-type': response.headers['content-type'],
                'content-length': response.headers['content-length'],
                'location': response.headers.location
            });
            
        } catch (error) {
            if (error.response) {
                console.log('❌ Download failed');
                console.log('   - Status:', error.response.status);
                console.log('   - Message:', error.response.data?.message || 'No message');
            } else {
                console.log('❌ Network error:', error.message);
            }
        }
    }
}

// Test published system downloads
async function testPublishedSystemDownloads(journalId) {
    console.log('\n🧪 Testing Published System Downloads...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const downloadTests = [
        {
            name: 'PDF Download (Redirect)',
            endpoint: `/api/published-journals/${journalId}/download/pdf`
        },
        {
            name: 'DOCX Download (Redirect)',
            endpoint: `/api/published-journals/${journalId}/download/docx`
        },
        {
            name: 'PDF Direct Download (Stream)',
            endpoint: `/api/published-journals/${journalId}/direct-download/pdf`
        },
        {
            name: 'DOCX Direct Download (Stream)',
            endpoint: `/api/published-journals/${journalId}/direct-download/docx`
        }
    ];
    
    for (const test of downloadTests) {
        console.log(`\n📥 Testing: ${test.name}`);
        
        try {
            const response = await axios.get(
                `${testConfig.apiBaseUrl}${test.endpoint}`,
                {
                    maxRedirects: 0,
                    validateStatus: (status) => status < 400 || status === 302 || status === 301,
                    timeout: 10000
                }
            );
            
            console.log('✅ Download endpoint accessible');
            console.log('   - Status:', response.status);
            console.log('   - Headers:', {
                'content-type': response.headers['content-type'],
                'content-length': response.headers['content-length'],
                'location': response.headers.location
            });
            
        } catch (error) {
            if (error.response) {
                console.log('❌ Download failed');
                console.log('   - Status:', error.response.status);
                console.log('   - Message:', error.response.data?.message || 'No message');
            } else {
                console.log('❌ Network error:', error.message);
            }
        }
    }
}

// Test journal retrieval for both systems
async function testJournalRetrieval() {
    console.log('\n🧪 Testing Journal Retrieval...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Test existing system
    try {
        console.log('📖 Testing existing system retrieval...');
        const existingResponse = await axios.get(`${testConfig.apiBaseUrl}/api/journals`);
        console.log('✅ Existing system retrieval successful');
        console.log('   - Total journals:', existingResponse.data.length || 'Unknown');
        
        if (existingResponse.data.length > 0) {
            const firstJournal = existingResponse.data[0];
            console.log('   - First journal:', firstJournal.title);
            console.log('   - ID:', firstJournal._id);
        }
    } catch (error) {
        console.error('❌ Existing system retrieval failed:', error.message);
    }
    
    // Test published system
    try {
        console.log('\n📖 Testing published system retrieval...');
        const publishedResponse = await axios.get(`${testConfig.apiBaseUrl}/api/published-journals`);
        console.log('✅ Published system retrieval successful');
        console.log('   - Total journals:', publishedResponse.data.data?.totalJournals || 'Unknown');
        console.log('   - Current year:', publishedResponse.data.data?.currentYear || 'Unknown');
        
        if (publishedResponse.data.data?.journals?.length > 0) {
            const firstJournal = publishedResponse.data.data.journals[0];
            console.log('   - First journal:', firstJournal.title);
            console.log('   - ID:', firstJournal._id);
            console.log('   - Volume:', `${firstJournal.volume_year} - Q${firstJournal.volume_quarter}`);
        }
    } catch (error) {
        console.error('❌ Published system retrieval failed:', error.message);
    }
}

// Cleanup test files
function cleanupTestFiles() {
    console.log('\n🧹 Cleaning up test files...');
    try {
        if (testConfig.testFiles.pdf && fs.existsSync(testConfig.testFiles.pdf)) {
            fs.unlinkSync(testConfig.testFiles.pdf);
            console.log('✅ PDF test file deleted');
        }
        if (testConfig.testFiles.docx && fs.existsSync(testConfig.testFiles.docx)) {
            fs.unlinkSync(testConfig.testFiles.docx);
            console.log('✅ DOCX test file deleted');
        }
        
        const testDir = path.join(__dirname, 'test-files');
        if (fs.existsSync(testDir)) {
            fs.rmdirSync(testDir);
            console.log('✅ Test directory removed');
        }
    } catch (error) {
        console.error('⚠️  Error during cleanup:', error.message);
    }
}

// Main test function
async function runBothSystemsTest() {
    console.log('🚀 Comprehensive Journal Systems Test');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('API Base URL:', testConfig.apiBaseUrl);
    console.log('Test started at:', new Date().toISOString());
    console.log('');
    
    try {
        // Setup
        createTestFiles();
        
        // Test uploads
        await testExistingSystemUpload();
        await testPublishedSystemUpload();
        
        // Test retrieval
        await testJournalRetrieval();
        
        // Test downloads
        if (testConfig.results.existingSystem.success) {
            await testExistingSystemDownloads(testConfig.results.existingSystem.journalId);
        }
        
        if (testConfig.results.publishedSystem.success) {
            await testPublishedSystemDownloads(testConfig.results.publishedSystem.journalId);
        }
        
        // Summary
        console.log('\n🎯 Test Summary');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📊 Results:');
        console.log('   - Existing System Upload:', testConfig.results.existingSystem.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log('   - Published System Upload:', testConfig.results.publishedSystem.success ? '✅ SUCCESS' : '❌ FAILED');
        
        if (testConfig.results.existingSystem.success) {
            console.log('\n📚 Existing System Journal:');
            console.log('   - ID:', testConfig.results.existingSystem.journalId);
            console.log('   - Title:', testConfig.results.existingSystem.data.title);
        }
        
        if (testConfig.results.publishedSystem.success) {
            console.log('\n📚 Published System Journal:');
            console.log('   - ID:', testConfig.results.publishedSystem.journalId);
            console.log('   - Title:', testConfig.results.publishedSystem.data.title);
            console.log('   - DOI:', testConfig.results.publishedSystem.data.doi);
        }
        
        console.log('\n🔗 Next Steps:');
        console.log('1. Start your frontend: npm start');
        console.log('2. Test existing system: http://localhost:3000/journals');
        console.log('3. Test published system: http://localhost:3000/published-journals');
        console.log('4. Try manual uploads and downloads in both systems');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
    } finally {
        cleanupTestFiles();
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runBothSystemsTest().catch(console.error);
}

module.exports = {
    runBothSystemsTest,
    testExistingSystemUpload,
    testPublishedSystemUpload,
    testExistingSystemDownloads,
    testPublishedSystemDownloads
};
