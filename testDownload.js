const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test URLs from our sample journals
const testUrls = [
    {
        name: "Sample Journal 1 - Sustainable Agriculture",
        url: "https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/sample_journal_1.pdf"
    },
    {
        name: "Sample Journal 2 - Climate Change",
        url: "https://res.cloudinary.com/dv2rs4pwy/raw/upload/v1/sample_journal_2.pdf"
    },
    {
        name: "Test with existing Cloudinary file",
        url: "https://res.cloudinary.com/dv2rs4pwy/image/upload/v1/sample.jpg"
    }
];

async function testDownload(url, filename) {
    return new Promise((resolve, reject) => {
        console.log(`🔗 Testing download: ${url}`);
        
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, (response) => {
            console.log(`📊 Status Code: ${response.statusCode}`);
            console.log(`📋 Headers:`, response.headers);
            
            if (response.statusCode === 200) {
                console.log(`✅ URL is accessible`);
                console.log(`📄 Content-Type: ${response.headers['content-type']}`);
                console.log(`📏 Content-Length: ${response.headers['content-length']} bytes`);
                
                // Try to save a small portion to test actual download
                const filePath = path.join(__dirname, 'downloads', filename);
                
                // Create downloads directory if it doesn't exist
                const downloadDir = path.dirname(filePath);
                if (!fs.existsSync(downloadDir)) {
                    fs.mkdirSync(downloadDir, { recursive: true });
                }
                
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    fileStream.close();
                    const stats = fs.statSync(filePath);
                    console.log(`💾 Downloaded ${stats.size} bytes to: ${filePath}`);
                    resolve({
                        success: true,
                        statusCode: response.statusCode,
                        contentType: response.headers['content-type'],
                        size: stats.size,
                        filePath: filePath
                    });
                });
                
                fileStream.on('error', (err) => {
                    console.log(`❌ File write error: ${err.message}`);
                    reject(err);
                });
                
            } else {
                console.log(`❌ Download failed with status: ${response.statusCode}`);
                resolve({
                    success: false,
                    statusCode: response.statusCode,
                    error: `HTTP ${response.statusCode}`
                });
            }
        });
        
        request.on('error', (err) => {
            console.log(`❌ Request error: ${err.message}`);
            resolve({
                success: false,
                error: err.message
            });
        });
        
        request.setTimeout(10000, () => {
            console.log(`⏰ Request timeout`);
            request.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });
    });
}

async function runDownloadTests() {
    console.log('🚀 Testing Journal Download Functionality');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const results = [];
    
    for (let i = 0; i < testUrls.length; i++) {
        const test = testUrls[i];
        console.log(`📖 Test ${i + 1}: ${test.name}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            const result = await testDownload(test.url, `test_${i + 1}.pdf`);
            results.push({
                name: test.name,
                url: test.url,
                ...result
            });
        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
            results.push({
                name: test.name,
                url: test.url,
                success: false,
                error: error.message
            });
        }
        
        console.log(''); // Empty line for spacing
    }
    
    // Summary
    console.log('📊 Download Test Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}`);
        if (result.success) {
            console.log(`   ✅ SUCCESS - ${result.contentType} (${result.size} bytes)`);
            console.log(`   📁 File: ${result.filePath}`);
        } else {
            console.log(`   ❌ FAILED - ${result.error}`);
        }
        console.log('');
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`🎯 Results: ${successCount}/${results.length} downloads successful`);
    
    if (successCount > 0) {
        console.log('\n✅ Download functionality is working!');
        console.log('💡 You can use these URLs in your journal documents');
    } else {
        console.log('\n⚠️  All downloads failed. Consider:');
        console.log('   - Checking Cloudinary account settings');
        console.log('   - Using different file URLs');
        console.log('   - Testing with actual uploaded files');
    }
    
    console.log('\n🔗 Test URLs used:');
    testUrls.forEach((test, index) => {
        console.log(`${index + 1}. ${test.url}`);
    });
}

// Run the tests
runDownloadTests().catch(console.error);
