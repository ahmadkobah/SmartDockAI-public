#!/usr/bin/env node

const axios = require('axios');

async function testAuthentication() {
    console.log('🔐 Testing SmartDockAI Authentication...\n');
    
    // Test data
    const adminCredentials = {
        email: 'admin@smartdockai.com',
        password: 'admin123'
    };
    
    const userCredentials = {
        email: 'user@smartdockai.com',
        password: 'user123'
    };
    
    try {
        // Test admin login
        console.log('🧑‍💼 Testing admin login...');
        const adminResponse = await axios.post(
            'http://localhost:3000/api/auth/login',
            adminCredentials,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Admin login SUCCESSFUL!');
        console.log(`👤 User: ${adminResponse.data.user.firstName} ${adminResponse.data.user.lastName}`);
        console.log(`📧 Email: ${adminResponse.data.user.email}`);
        console.log(`🔑 Access Token: ${adminResponse.data.accessToken.substring(0, 50)}...`);
        console.log(`🔄 Refresh Token: ${adminResponse.data.refreshToken.substring(0, 50)}...`);
        
        // Test user login
        console.log('\n👤 Testing user login...');
        const userResponse = await axios.post(
            'http://localhost:3000/api/auth/login',
            userCredentials,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ User login SUCCESSFUL!');
        console.log(`👤 User: ${userResponse.data.user.firstName} ${userResponse.data.user.lastName}`);
        console.log(`📧 Email: ${userResponse.data.user.email}`);
        console.log(`🔑 Access Token: ${userResponse.data.accessToken.substring(0, 50)}...`);
        
        console.log('\n🎉 All authentication tests PASSED!');
        
    } catch (error) {
        console.log('❌ Authentication test FAILED!');
        console.log(`Error: ${error.message}`);
        
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Response:`, error.response.data);
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Tip: Make sure the SmartDockAI server is running on port 3000');
            console.log('   Run: npm start (in another terminal)');
        }
    }
}

// Test invalid credentials
async function testInvalidCredentials() {
    console.log('\n🚫 Testing invalid credentials...');
    
    try {
        await axios.post(
            'http://localhost:3000/api/auth/login',
            {
                email: 'admin@smartdockai.com',
                password: 'wrongpassword'
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('❌ This should have failed!');
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('✅ Invalid credentials correctly rejected');
        } else {
            console.log(`❌ Unexpected error: ${error.message}`);
        }
    }
}

async function runAllTests() {
    await testAuthentication();
    await testInvalidCredentials();
}

if (require.main === module) {
    runAllTests();
}