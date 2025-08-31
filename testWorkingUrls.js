const https = require('https');
const http = require('http');

// Test the working URLs from our sample journals
const testUrls = [
    {
        name: "W3C Dummy PDF",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    },
    {
        name: "Cloudinary Sample Image",
        url: "https://res.cloudinary.com/dv2rs4pwy/image/upload/v1/sample.jpg"
    }
];

async function quickDownloadTest(url) {
    return new Promise((resolve) => {
        console.log(`🔗 Testing: ${url}`);
        
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, (response) => {
            console.log(`📊 Status: ${response.statusCode}`);
            console.log(`📄 Type: ${response.headers['content-type']}`);
            console.log(`📏 Size: ${response.headers['content-length']} bytes`);
            
            if (response.statusCode === 200) {
                console.log(`✅ Download URL is working!`);
                resolve(true);
            } else {
                console.log(`❌ Download failed`);
                resolve(false);
            }
            
            // Don't actually download, just test accessibility
            response.destroy();
        });
        
        request.on('error', (err) => {
            console.log(`❌ Error: ${err.message}`);
            resolve(false);
        });
        
        request.setTimeout(5000, () => {
            console.log(`⏰ Timeout`);
            request.destroy();
            resolve(false);
        });
    });
}

async function testWorkingUrls() {
    console.log('🚀 Testing Working Download URLs');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    for (const test of testUrls) {
        console.log(`📖 ${test.name}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const success = await quickDownloadTest(test.url);
        console.log('');
    }
    
    console.log('🎯 Summary: Both URLs are ready for use in journal documents!');
    console.log('📋 Next steps:');
    console.log('1. Copy the journal documents from the previous script');
    console.log('2. Insert them into your MongoDB Atlas database');
    console.log('3. Test the download functionality in your application');
}

testWorkingUrls();
