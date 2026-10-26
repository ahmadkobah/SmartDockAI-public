#!/usr/bin/env node

/**
 * SmartDockAI Document Intelligence Integration Test
 * 
 * Tests the complete document processing pipeline:
 * 1. File upload to Document Intelligence service
 * 2. Text extraction via OCR/ICR services
 * 3. NLP analysis for enhanced understanding
 * 4. Classification, extraction, validation, and routing
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    baseUrl: 'http://localhost:3000/api',
    intelligenceUrl: 'http://localhost:8004',
    ocrUrl: 'http://localhost:8000',
    icrUrl: 'http://localhost:8001',
    nlpUrl: 'http://localhost:8002',
    timeout: 60000
};

// Test data
const testDocument = {
    content: "Invoice #INV-2024-001\n\nDate: March 15, 2024\nFrom: SmartDock Corporation\nTo: Client ABC Ltd\n\nServices Rendered:\n- Document Processing: $2,500\n- OCR Analysis: $1,200\n- Total Amount: $3,700\n\nPayment Terms: Net 30 days\nDue Date: April 14, 2024",
    filename: "test_invoice.txt",
    metadata: {
        source: "integration_test",
        test_type: "full_pipeline"
    }
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testServiceHealth(serviceName, url) {
    try {
        console.log(`\n🔍 Testing ${serviceName} health...`);
        const response = await axios.get(`${url}/health`, { timeout: 5000 });
        console.log(`✅ ${serviceName} is healthy:`, response.data);
        return true;
    } catch (error) {
        console.error(`❌ ${serviceName} health check failed:`, error.message);
        return false;
    }
}

async function testDocumentIntelligenceAnalysis() {
    try {
        console.log('\n📋 Testing Document Intelligence Analysis...');
        
        const response = await axios.post(
            `${config.intelligenceUrl}/intelligence/analyze`,
            testDocument,
            { timeout: config.timeout }
        );
        
        console.log('✅ Document Intelligence Analysis Result:');
        console.log('📊 Classification:', response.data.classification_result);
        console.log('🔍 Extraction:', response.data.extraction_result);
        console.log('✔️ Validation:', response.data.validation_result);
        console.log('🎯 Routing:', response.data.routing_result);
        console.log('📈 Intelligence Score:', response.data.metadata.intelligence_score);
        
        return response.data;
    } catch (error) {
        console.error('❌ Document Intelligence Analysis failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return null;
    }
}

async function testClassificationOnly() {
    try {
        console.log('\n📂 Testing Document Classification...');
        
        const requestData = {
            document: testDocument,
            confidence_threshold: 0.8,
            return_all_predictions: true
        };
        
        const response = await axios.post(
            `${config.intelligenceUrl}/classification/classify`,
            requestData,
            { timeout: config.timeout }
        );
        
        console.log('✅ Classification Result:');
        console.log('📋 Document Type:', response.data.document_type);
        console.log('📊 Confidence:', response.data.confidence);
        console.log('📁 Sub-categories:', response.data.sub_categories);
        
        return response.data;
    } catch (error) {
        console.error('❌ Classification test failed:', error.message);
        return null;
    }
}

async function testEntityExtraction() {
    try {
        console.log('\n🔍 Testing Entity Extraction...');
        
        const requestData = {
            document: testDocument,
            extraction_types: ["amounts", "dates", "organizations", "invoice_numbers"],
            custom_patterns: {
                "invoice_pattern": "INV-\\d{4}-\\d{3}"
            }
        };
        
        const response = await axios.post(
            `${config.intelligenceUrl}/extraction/extract`,
            requestData,
            { timeout: config.timeout }
        );
        
        console.log('✅ Entity Extraction Result:');
        console.log('💰 Extracted Entities:', response.data.entities);
        console.log('📊 Confidence Scores:', response.data.confidence_scores);
        
        return response.data;
    } catch (error) {
        console.error('❌ Entity extraction test failed:', error.message);
        return null;
    }
}

async function testFileUpload() {
    try {
        console.log('\n📤 Testing File Upload and Analysis...');
        
        // Create a test text file
        const testContent = testDocument.content;
        const testFilePath = path.join(__dirname, 'temp_test_document.txt');
        fs.writeFileSync(testFilePath, testContent);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFilePath), {
            filename: 'test_document.txt',
            contentType: 'text/plain'
        });
        formData.append('analysis_type', 'full');
        formData.append('confidence_threshold', '0.8');
        
        const response = await axios.post(
            `${config.intelligenceUrl}/upload/analyze`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Content-Length': formData.getLengthSync()
                },
                timeout: config.timeout,
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );
        
        console.log('✅ File Upload Analysis Result:');
        console.log('📄 Text Extraction:', response.data.metadata?.extraction_method);
        console.log('🔄 Processing Time:', response.data.metadata?.processing_time);
        console.log('📊 Analysis Score:', response.data.metadata?.intelligence_score);
        
        // Clean up test file
        fs.unlinkSync(testFilePath);
        
        return response.data;
    } catch (error) {
        console.error('❌ File upload test failed:', error.message);
        return null;
    }
}

async function testOCRIntegration() {
    try {
        console.log('\n🖼️ Testing OCR Service Integration...');
        
        const testData = {
            text: "Test document for OCR processing",
            filename: "test_ocr.jpg",
            metadata: { test: true }
        };
        
        const response = await axios.post(
            `${config.ocrUrl}/ocr/analyze`,
            testData,
            { timeout: config.timeout }
        );
        
        console.log('✅ OCR Service Response:');
        console.log('📄 Service Status:', response.status);
        console.log('🔧 OCR Available:', response.data ? 'Yes' : 'No');
        
        return response.data;
    } catch (error) {
        console.error('❌ OCR integration test failed:', error.message);
        return null;
    }
}

async function testNLPIntegration() {
    try {
        console.log('\n🧠 Testing NLP Service Integration...');
        
        const testData = {
            text: testDocument.content,
            analysis_types: ["sentiment", "entities", "summary"]
        };
        
        const response = await axios.post(
            `${config.nlpUrl}/nlp/analyze`,
            testData,
            { timeout: config.timeout }
        );
        
        console.log('✅ NLP Service Response:');
        console.log('📊 Sentiment:', response.data.sentiment);
        console.log('🏷️ Entities:', response.data.entities?.slice(0, 5)); // Show first 5
        console.log('📝 Summary Available:', response.data.summary ? 'Yes' : 'No');
        
        return response.data;
    } catch (error) {
        console.error('❌ NLP integration test failed:', error.message);
        return null;
    }
}

async function runIntegrationTests() {
    console.log('🚀 Starting SmartDockAI Document Intelligence Integration Tests');
    console.log('=' .repeat(70));
    
    const results = {
        services_health: {},
        intelligence_tests: {},
        integration_tests: {}
    };
    
    // Test service health
    console.log('\n📋 Phase 1: Service Health Checks');
    results.services_health.intelligence = await testServiceHealth('Document Intelligence', config.intelligenceUrl);
    results.services_health.ocr = await testServiceHealth('OCR Service', config.ocrUrl);
    results.services_health.icr = await testServiceHealth('ICR Service', config.icrUrl);
    results.services_health.nlp = await testServiceHealth('NLP Service', config.nlpUrl);
    
    // Wait a moment for services to be ready
    await delay(2000);
    
    // Test Document Intelligence features
    console.log('\n📋 Phase 2: Document Intelligence Features');
    results.intelligence_tests.full_analysis = await testDocumentIntelligenceAnalysis();
    await delay(1000);
    
    results.intelligence_tests.classification = await testClassificationOnly();
    await delay(1000);
    
    results.intelligence_tests.extraction = await testEntityExtraction();
    await delay(1000);
    
    results.intelligence_tests.file_upload = await testFileUpload();
    await delay(1000);
    
    // Test service integrations
    console.log('\n📋 Phase 3: Service Integration Tests');
    results.integration_tests.ocr = await testOCRIntegration();
    await delay(1000);
    
    results.integration_tests.nlp = await testNLPIntegration();
    
    // Generate test report
    console.log('\n' + '='.repeat(70));
    console.log('📊 INTEGRATION TEST RESULTS SUMMARY');
    console.log('='.repeat(70));
    
    // Service Health Summary
    console.log('\n🏥 Service Health Status:');
    Object.entries(results.services_health).forEach(([service, healthy]) => {
        console.log(`  ${healthy ? '✅' : '❌'} ${service.toUpperCase()} Service`);
    });
    
    // Feature Test Summary
    console.log('\n🧪 Document Intelligence Features:');
    Object.entries(results.intelligence_tests).forEach(([test, result]) => {
        console.log(`  ${result ? '✅' : '❌'} ${test.replace('_', ' ').toUpperCase()}`);
    });
    
    // Integration Test Summary
    console.log('\n🔗 Service Integration Status:');
    Object.entries(results.integration_tests).forEach(([service, result]) => {
        console.log(`  ${result ? '✅' : '❌'} ${service.toUpperCase()} Integration`);
    });
    
    // Overall Status
    const healthyServices = Object.values(results.services_health).filter(Boolean).length;
    const totalServices = Object.keys(results.services_health).length;
    const successfulFeatures = Object.values(results.intelligence_tests).filter(Boolean).length;
    const totalFeatures = Object.keys(results.intelligence_tests).length;
    const successfulIntegrations = Object.values(results.integration_tests).filter(Boolean).length;
    const totalIntegrations = Object.keys(results.integration_tests).length;
    
    console.log('\n📈 Overall Integration Status:');
    console.log(`  🏥 Services: ${healthyServices}/${totalServices} healthy`);
    console.log(`  🧪 Features: ${successfulFeatures}/${totalFeatures} working`);
    console.log(`  🔗 Integrations: ${successfulIntegrations}/${totalIntegrations} functional`);
    
    const overallSuccess = healthyServices === totalServices && 
                          successfulFeatures >= totalFeatures * 0.8 && 
                          successfulIntegrations >= totalIntegrations * 0.8;
    
    console.log(`\n🎯 Integration Status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 Congratulations! Your Document Intelligence System is fully integrated and working!');
        console.log('🚀 All services are communicating properly and the complete pipeline is functional.');
    } else {
        console.log('\n⚠️ Some integration issues detected. Please check the failing components above.');
        console.log('🔧 Ensure all services are running and properly configured.');
    }
    
    return results;
}

// Run tests if called directly
if (require.main === module) {
    runIntegrationTests().catch(error => {
        console.error('\n💥 Integration test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = { runIntegrationTests };