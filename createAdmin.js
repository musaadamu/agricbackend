const bcrypt = require('bcryptjs');

async function createHashedPassword() {
    const password = 'musa@@@2025';
    const saltRounds = 12;
    
    console.log('🔐 Generating hashed password for admin user...\n');
    
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('✅ Admin User Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 Name: Musa Adamu');
        console.log('📧 Email: msmajemusa4@gmail.com');
        console.log('🔑 Password: musa@@@2025');
        console.log('🛡️  Role: admin');
        console.log('🔐 Hashed Password:', hashedPassword);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const adminDocument = {
            name: "Musa Adamu",
            email: "msmajemusa4@gmail.com",
            password: hashedPassword,
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('📄 MongoDB Document to Insert:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(JSON.stringify(adminDocument, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('📋 Instructions:');
        console.log('1. Copy the MongoDB document above');
        console.log('2. Go to MongoDB Atlas → Browse Collections');
        console.log('3. Select your database → users collection');
        console.log('4. Click "Insert Document"');
        console.log('5. Paste the document and click "Insert"');
        console.log('6. Try logging in with the credentials above\n');
        
        console.log('🌐 Alternative: Use Registration API');
        console.log('POST http://localhost:5000/api/auth/register');
        console.log('Content-Type: application/json');
        console.log(JSON.stringify({
            name: "Musa Adamu",
            email: "msmajemusa4@gmail.com",
            password: "musa@@@2025",
            role: "admin"
        }, null, 2));
        
    } catch (error) {
        console.error('❌ Error generating password hash:', error);
    }
}

console.log('🚀 Admin Account Creation Helper');
console.log('═══════════════════════════════════════════════════════════════\n');

createHashedPassword();
