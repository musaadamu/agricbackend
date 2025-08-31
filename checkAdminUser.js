// Script to check and fix admin user login issues
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User model (simplified)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function checkAndFixAdminUser() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const adminEmail = 'msmajemusa4@gmail.com';
        const adminPassword = 'musa@@@2025';

        console.log('\n🔍 Checking for admin user...');
        let adminUser = await User.findOne({ email: adminEmail });

        if (!adminUser) {
            console.log('❌ Admin user not found. Creating new admin user...');
            
            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

            // Create admin user
            adminUser = new User({
                name: 'Musa Adamu',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });

            await adminUser.save();
            console.log('✅ Admin user created successfully!');
        } else {
            console.log('✅ Admin user found!');
            console.log('📋 User details:');
            console.log('   - Name:', adminUser.name);
            console.log('   - Email:', adminUser.email);
            console.log('   - Role:', adminUser.role);
            console.log('   - Verified:', adminUser.isVerified);
            console.log('   - Created:', adminUser.createdAt);

            // Test password
            const isPasswordValid = await bcrypt.compare(adminPassword, adminUser.password);
            console.log('   - Password Valid:', isPasswordValid);

            if (!isPasswordValid) {
                console.log('\n🔧 Password mismatch! Updating password...');
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
                
                await User.updateOne(
                    { email: adminEmail },
                    { 
                        password: hashedPassword,
                        role: 'admin',
                        isVerified: true
                    }
                );
                console.log('✅ Password updated successfully!');
            }

            // Ensure user is admin and verified
            if (adminUser.role !== 'admin' || !adminUser.isVerified) {
                console.log('\n🔧 Updating user role and verification status...');
                await User.updateOne(
                    { email: adminEmail },
                    { 
                        role: 'admin',
                        isVerified: true
                    }
                );
                console.log('✅ User role and verification updated!');
            }
        }

        // Final verification
        console.log('\n🧪 Final verification...');
        const finalUser = await User.findOne({ email: adminEmail });
        const finalPasswordCheck = await bcrypt.compare(adminPassword, finalUser.password);

        console.log('📋 Final user state:');
        console.log('   - Name:', finalUser.name);
        console.log('   - Email:', finalUser.email);
        console.log('   - Role:', finalUser.role);
        console.log('   - Verified:', finalUser.isVerified);
        console.log('   - Password Valid:', finalPasswordCheck);

        if (finalPasswordCheck && finalUser.role === 'admin' && finalUser.isVerified) {
            console.log('\n🎉 Admin user is ready for login!');
            console.log('📧 Email: msmajemusa4@gmail.com');
            console.log('🔑 Password: musa@@@2025');
        } else {
            console.log('\n❌ There are still issues with the admin user.');
        }

        // List all users for debugging
        console.log('\n👥 All users in database:');
        const allUsers = await User.find({}).select('name email role isVerified createdAt');
        allUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role} - Verified: ${user.isVerified}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the check
checkAndFixAdminUser().catch(console.error);
