const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Import User model
const User = require('../models/User');

const updatePassword = async () => {
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            retryReads: true,
            maxPoolSize: 10,
        });
        console.log('✅ MongoDB connected successfully');

        // Email and new password
        const email = 'msmajemusa4@gmail.com';
        const newPassword = 'agric@@@2025';

        // Find user by email
        console.log(`\n🔍 Finding user with email: ${email}`);
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        console.log(`✅ User found: ${user.name} (${user.email})`);

        // Update password
        console.log(`\n🔐 Updating password...`);
        user.password = newPassword;
        await user.save();

        console.log(`✅ Password updated successfully!`);
        console.log(`\n📋 User Details:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Updated At: ${new Date().toISOString()}`);

        // Close connection
        await mongoose.connection.close();
        console.log(`\n✅ Database connection closed`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating password:', error.message);
        process.exit(1);
    }
};

// Run the update
updatePassword();

