#!/usr/bin/env node

/**
 * Quick Document Intelligence Integration Test
 * 
 * Simple test to verify all services are running and can communicate
 */

const axios = require('axios');

async function quickTest() {
    const services = [
        { name: 'OCR Service', url: 'http://localhost:8000/health' },
        { name: 'ICR Service', url: 'http://localhost:8001/health' },
        { name: 'NLP Service', url: 'http://localhost:8002/health' },
        { name: 'Document Intelligence', url: 'http://localhost:8004/health' },
        { name: 'Main App', url: 'http://localhost:3000/health' }
    ];

    console.log('🔍 Testing SmartDockAI Services...\n');

    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: HEALTHY`);
        } catch (error) {
            console.log(`❌ ${service.name}: FAILED - ${error.message}`);
        }
    }

    // Test Document Intelligence text processing
    try {
        const testDoc = {
            content: "Test invoice document with amount $1,500",
            filename: "test.txt",
            metadata: { test: true }
        };

        const response = await axios.post(
            'http://localhost:8004/intelligence/analyze',
            testDoc,
            { timeout: 30000 }
        );

        console.log('\n✅ Document Intelligence Processing: SUCCESS');
        console.log('📊 Analysis completed with intelligence score:', 
                   response.data?.metadata?.intelligence_score || 'N/A');
    } catch (error) {
        console.log('\n❌ Document Intelligence Processing: FAILED');
        console.log('Error:', error.message);
    }
}

if (require.main === module) {
    quickTest().catch(console.error);
}

module.exports = { quickTest };