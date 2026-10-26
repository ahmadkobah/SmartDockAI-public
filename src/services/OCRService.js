const Tesseract = require('tesseract.js');
const sharp = require('sharp');

class OCRService {
  constructor() {
    this.isInitialized = false;
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif', 'pdf'];
    this.defaultLanguages = ['eng', 'deu', 'fra', 'spa']; // English, German, French, Spanish
  }

  /**
   * Initialize OCR service
   */
  async initialize() {
    try {
      // Test Tesseract initialization
      console.warn('🔍 Initializing OCR Service...');
      this.isInitialized = true;
      console.warn('✅ OCR Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OCR Service:', error);
      throw error;
    }
  }

  /**
   * Check if file format is supported for OCR
   */
  isSupportedFormat(mimeType) {
    const supportedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/bmp',
      'image/tiff',
      'image/gif',
      'application/pdf'
    ];
    return supportedMimes.includes(mimeType.toLowerCase());
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(inputBuffer, options = {}) {
    try {
      const {
        enhanceContrast = true,
        denoise = true,
        resize = false,
        targetWidth = 2000
      } = options;

      let processor = sharp(inputBuffer);

      // Get image metadata
      const metadata = await processor.metadata();
      
      // Resize if image is too large or resize is explicitly requested
      if (resize || (metadata.width && metadata.width > targetWidth)) {
        processor = processor.resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convert to grayscale for better OCR
      processor = processor.grayscale();

      // Enhance contrast
      if (enhanceContrast) {
        processor = processor.normalize();
      }

      // Apply sharpening
      processor = processor.sharpen();

      // Denoise (median filter effect)
      if (denoise) {
        processor = processor.median();
      }

      // Convert to PNG for Tesseract
      const processedBuffer = await processor.png().toBuffer();

      return {
        buffer: processedBuffer,
        format: 'png',
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      console.error('Error preprocessing image:', error);
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractTextFromImage(imageBuffer, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        language = 'eng',
        preprocessImage = true,
        oem = 1, // LSTM OCR Engine Mode
        psm = 3  // Fully automatic page segmentation
      } = options;

      let processedBuffer = imageBuffer;
      let preprocessingInfo = null;

      // Preprocess image if requested
      if (preprocessImage) {
        const result = await this.preprocessImage(imageBuffer, options.preprocessing || {});
        processedBuffer = result.buffer;
        preprocessingInfo = {
          originalWidth: result.width,
          originalHeight: result.height,
          processed: true
        };
      }

      // Configure Tesseract
      const tesseractOptions = {
        lang: language,
        oem,
        psm
      };

      console.warn(`🔍 Starting OCR processing with language: ${language}`);
      
      // Perform OCR
      const { data } = await Tesseract.recognize(processedBuffer, tesseractOptions);

      const result = {
        text: data.text.trim(),
        confidence: data.confidence,
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        lines: data.lines.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })),
        paragraphs: data.paragraphs.map(para => ({
          text: para.text,
          confidence: para.confidence,
          bbox: para.bbox
        })),
        metadata: {
          language,
          processingTime: Date.now(),
          preprocessing: preprocessingInfo,
          engine: 'tesseract.js',
          version: '4.x'
        }
      };

      console.warn(`✅ OCR completed. Confidence: ${data.confidence}%, Text length: ${data.text.length} chars`);
      
      return result;
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract metadata from OCR results based on document type
   */
  extractMetadataFromText(text, documentType = 'general') {
    const metadata = {};

    try {
      switch (documentType.toLowerCase()) {
        case 'invoice':
          metadata.invoiceNumber = this.extractInvoiceNumber(text);
          metadata.amount = this.extractAmount(text);
          metadata.date = this.extractDate(text);
          metadata.vendor = this.extractVendor(text);
          break;

        case 'identity':
          metadata.name = this.extractName(text);
          metadata.documentNumber = this.extractDocumentNumber(text);
          metadata.expirationDate = this.extractExpirationDate(text);
          metadata.birthDate = this.extractBirthDate(text);
          break;

        case 'contract':
          metadata.parties = this.extractParties(text);
          metadata.effectiveDate = this.extractEffectiveDate(text);
          metadata.expirationDate = this.extractContractExpiration(text);
          break;

        default:
          // General document metadata
          metadata.title = this.extractTitle(text);
          metadata.author = this.extractAuthor(text);
          metadata.dates = this.extractDates(text);
          metadata.emails = this.extractEmails(text);
          metadata.phoneNumbers = this.extractPhoneNumbers(text);
          break;
      }

      // Always extract common metadata
      metadata.wordCount = text.split(/\s+/).length;
      metadata.characterCount = text.length;
      metadata.language = this.detectLanguage(text);

      return metadata;
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return { error: error.message };
    }
  }

  // Metadata extraction helper methods
  extractInvoiceNumber(text) {
    const patterns = [
      /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /inv\s*#?\s*:?\s*([A-Z0-9-]+)/i,
      /rechnung\s*#?\s*:?\s*([A-Z0-9-]+)/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractAmount(text) {
    const patterns = [
      /total\s*:?\s*\$?€?([0-9,]+\.?[0-9]*)/i,
      /amount\s*:?\s*\$?€?([0-9,]+\.?[0-9]*)/i,
      /\$([0-9,]+\.?[0-9]*)/,
      /€([0-9,]+\.?[0-9]*)/
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractDate(text) {
    const patterns = [
      /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/,
      /\b(\d{2,4}[/.-]\d{1,2}[/.-]\d{1,2})\b/,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractName(text) {
    const patterns = [
      /name\s*:?\s*([A-Za-z\s]+)/i,
      /surname\s*:?\s*([A-Za-z\s]+)/i,
      /given\s*names?\s*:?\s*([A-Za-z\s]+)/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractDocumentNumber(text) {
    const patterns = [
      /passport\s*#?\s*:?\s*([A-Z0-9]+)/i,
      /id\s*#?\s*:?\s*([A-Z0-9]+)/i,
      /document\s*#?\s*:?\s*([A-Z0-9]+)/i,
      /number\s*:?\s*([A-Z0-9]+)/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractExpirationDate(text) {
    const patterns = [
      /expires?\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /expiry\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /valid\s*until\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractBirthDate(text) {
    const patterns = [
      /birth\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /born\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /dob\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractVendor(text) {
    const lines = text.split('\n');
    // Usually vendor name is in the first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 3 && line.length < 100 && /^[A-Za-z\s&.,'-]+$/.test(line)) {
        return line;
      }
    }
    return null;
  }

  extractTitle(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    // First non-empty line is often the title
    return lines.length > 0 ? lines[0].trim() : null;
  }

  extractAuthor(text) {
    const patterns = [
      /author\s*:?\s*([A-Za-z\s]+)/i,
      /by\s+([A-Za-z\s]+)/i,
      /written\s*by\s*:?\s*([A-Za-z\s]+)/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractParties(text) {
    const patterns = [
      /between\s+([^.]+?)\s+and\s+([^.]+)/i,
      /party\s*:?\s*([A-Za-z\s&.,'-]+)/gi
    ];
    
    const matches = [];
    patterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        matches.push(...match.slice(1));
      }
    });
    return matches.length > 0 ? matches : null;
  }

  extractEffectiveDate(text) {
    const patterns = [
      /effective\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /starts?\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /commencing\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractContractExpiration(text) {
    const patterns = [
      /expires?\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /ends?\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /termination\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i
    ];
    return this.findFirstMatch(text, patterns);
  }

  extractDates(text) {
    const pattern = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g;
    const matches = text.match(pattern);
    return matches || [];
  }

  extractEmails(text) {
    const pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(pattern);
    return matches || [];
  }

  extractPhoneNumbers(text) {
    const patterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      /\(\d{3}\)\s*\d{3}[-.]?\d{4}/g,
      /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g
    ];
    
    const matches = [];
    patterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found);
      }
    });
    return [...new Set(matches)]; // Remove duplicates
  }

  detectLanguage(text) {
    // Simple language detection based on common words
    const languages = {
      eng: ['the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'you', 'that'],
      deu: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
      fra: ['le', 'de', 'et', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que'],
      spa: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se']
    };

    const words = text.toLowerCase().split(/\s+/);
    const scores = {};

    Object.keys(languages).forEach(lang => {
      scores[lang] = 0;
      languages[lang].forEach(commonWord => {
        scores[lang] += words.filter(word => word === commonWord).length;
      });
    });

    const maxScore = Math.max(...Object.values(scores));
    const detectedLang = Object.keys(scores).find(lang => scores[lang] === maxScore);
    
    return maxScore > 0 ? detectedLang : 'eng'; // Default to English
  }

  findFirstMatch(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Get supported languages for OCR
   */
  getSupportedLanguages() {
    return this.defaultLanguages;
  }

  /**
   * Validate OCR options
   */
  validateOptions(options) {
    const validLanguages = this.defaultLanguages;
    const { language = 'eng' } = options;

    if (!validLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}. Supported languages: ${validLanguages.join(', ')}`);
    }

    return true;
  }
}

module.exports = new OCRService();