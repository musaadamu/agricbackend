const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the User model
const User = require('../models/User');

// Admin user credentials
const adminCredentials = {
    name: 'Musa Adamu',
    email: 'msmajemusa4@gmail.com',
    password: 'musa@@@2025',
    role: 'admin'
};

async function createAdminUser() {
    try {
        // Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        console.log('📍 Using connection string:', process.env.MONGODB_URI ? 'Found in .env' : 'NOT FOUND');

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables. Please check your .env file.');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // Check if admin user already exists
        console.log('🔍 Checking if admin user already exists...');
        const existingUser = await User.findOne({ email: adminCredentials.email });
        
        if (existingUser) {
            console.log('⚠️  Admin user already exists with email:', adminCredentials.email);
            console.log('📋 Existing user details:');
            console.log('   - Name:', existingUser.name);
            console.log('   - Email:', existingUser.email);
            console.log('   - Role:', existingUser.role);
            console.log('   - Created:', existingUser.createdAt);
            
            // Update role to admin if not already admin
            if (existingUser.role !== 'admin') {
                console.log('🔄 Updating user role to admin...');
                existingUser.role = 'admin';
                await existingUser.save();
                console.log('✅ User role updated to admin successfully');
            } else {
                console.log('✅ User already has admin role');
            }
            
            await mongoose.connection.close();
            return;
        }

        // Hash the password
        console.log('🔐 Hashing password...');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(adminCredentials.password, saltRounds);
        console.log('✅ Password hashed successfully');

        // Create the admin user
        console.log('👤 Creating admin user...');
        const adminUser = new User({
            name: adminCredentials.name,
            email: adminCredentials.email,
            password: hashedPassword,
            role: adminCredentials.role
        });

        // Save the admin user
        const savedUser = await adminUser.save();
        console.log('✅ Admin user created successfully!');
        
        // Display user details (without password)
        console.log('\n📋 Admin User Details:');
        console.log('   - ID:', savedUser._id);
        console.log('   - Name:', savedUser.name);
        console.log('   - Email:', savedUser.email);
        console.log('   - Role:', savedUser.role);
        console.log('   - Created:', savedUser.createdAt);
        
        console.log('\n🎉 Admin account setup complete!');
        console.log('🔑 Login credentials:');
        console.log('   - Email:', adminCredentials.email);
        console.log('   - Password:', adminCredentials.password);
        console.log('\n⚠️  Please change the password after first login for security.');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);

        if (error.code === 11000) {
            console.error('💡 This error usually means the email already exists in the database.');
        }

        if (error.name === 'ValidationError') {
            console.error('💡 Validation errors:');
            Object.keys(error.errors).forEach(key => {
                console.error(`   - ${key}: ${error.errors[key].message}`);
            });
        }

        if (error.message.includes('Authentication failed') || error.code === 8000) {
            console.error('💡 Database authentication failed. Please check:');
            console.error('   - Your MongoDB Atlas username and password');
            console.error('   - Network access settings in MongoDB Atlas');
            console.error('   - Database connection string in .env file');
            console.error('   - Make sure your IP address is whitelisted in MongoDB Atlas');
        }

        if (error.message.includes('MONGODB_URI')) {
            console.error('💡 Please ensure your .env file contains the correct MONGODB_URI');
        }
    } finally {
        // Close the database connection
        console.log('🔌 Closing database connection...');
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    }
}

// Run the script
console.log('🚀 Starting admin user creation script...');
console.log('📧 Email:', adminCredentials.email);
console.log('👤 Name:', adminCredentials.name);
console.log('🔐 Role:', adminCredentials.role);
console.log('');

createAdminUser();
