"""
Enhanced OCR Engine with Multi-language Support and Analytics

Advanced OCR engine implementation with confidence scoring, batch processing,
multi-language support, and comprehensive analytics.
"""

import time
import cv2
import numpy as np
import pytesseract
from PIL import Image
from typing import Dict, List, Any, Optional, Tuple
import logging
import json
import os
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import statistics
import re
from collections import defaultdict, Counter
import hashlib

from .base_engine import (
    OCREngineInterface, 
    OCRResult, 
    OCRWord, 
    OCRLine, 
    OCRParagraph, 
    BoundingBox,
    TrainingData
)


class EnhancedOCREngine(OCREngineInterface):
    """Enhanced OCR engine with advanced features and analytics."""
    
    # Supported languages with their Tesseract codes
    SUPPORTED_LANGUAGES = {
        'english': 'eng',
        'spanish': 'spa',
        'french': 'fra',
        'german': 'deu',
        'italian': 'ita',
        'portuguese': 'por',
        'russian': 'rus',
        'chinese_simplified': 'chi_sim',
        'chinese_traditional': 'chi_tra',
        'japanese': 'jpn',
        'korean': 'kor',
        'arabic': 'ara',
        'hindi': 'hin',
        'dutch': 'nld',
        'swedish': 'swe',
        'norwegian': 'nor',
        'danish': 'dan',
        'finnish': 'fin',
        'polish': 'pol',
        'czech': 'ces',
        'hungarian': 'hun',
        'romanian': 'ron',
        'turkish': 'tur',
        'greek': 'ell',
        'bulgarian': 'bul',
        'ukrainian': 'ukr',
        'hebrew': 'heb',
        'thai': 'tha',
        'vietnamese': 'vie',
        'indonesian': 'ind',
        'malay': 'msa'
    }
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.engine_name = "enhanced_tesseract"
        self.version = "2.0.0"
        
        # Enhanced configuration
        self.tesseract_cmd = config.get("tesseract_cmd", "tesseract")
        self.data_path = config.get("data_path", None)
        self.training_output_dir = config.get("training_output_dir", "./training_data")
        self.analytics_dir = config.get("analytics_dir", "./analytics")
        self.cache_dir = config.get("cache_dir", "./cache")
        
        # Performance settings
        self.max_workers = config.get("max_workers", 4)
        self.batch_size = config.get("batch_size", 10)
        self.enable_caching = config.get("enable_caching", True)
        self.cache_ttl = config.get("cache_ttl", 3600)  # 1 hour
        
        # Quality thresholds
        self.min_confidence = config.get("min_confidence", 30)
        self.high_confidence_threshold = config.get("high_confidence_threshold", 80)
        self.word_confidence_threshold = config.get("word_confidence_threshold", 60)
        
        # Advanced OCR configurations
        self.ocr_configs = {
            'standard': {
                'oem': 1,  # LSTM OCR Engine Mode
                'psm': 3,  # Fully automatic page segmentation
                'preserve_interword_spaces': 1
            },
            'single_block': {
                'oem': 1,
                'psm': 6,  # Single uniform block of text
                'preserve_interword_spaces': 1
            },
            'single_line': {
                'oem': 1,
                'psm': 7,  # Single text line
                'preserve_interword_spaces': 1
            },
            'single_word': {
                'oem': 1,
                'psm': 8,  # Single word
                'preserve_interword_spaces': 0
            },
            'sparse_text': {
                'oem': 1,
                'psm': 11,  # Sparse text
                'preserve_interword_spaces': 1
            },
            'document': {
                'oem': 1,
                'psm': 1,  # Automatic page segmentation with OSD
                'preserve_interword_spaces': 1
            }
        }
        
        # Analytics storage
        self.analytics = {
            'total_processed': 0,
            'total_processing_time': 0,
            'language_usage': defaultdict(int),
            'confidence_scores': [],
            'error_counts': defaultdict(int),
            'batch_sizes': [],
            'quality_metrics': {
                'high_confidence': 0,
                'medium_confidence': 0,
                'low_confidence': 0
            }
        }
        
        # Cache for processed images
        self.result_cache = {}
        
        # Ensure directories exist
        self._create_directories()
        
        # Load analytics if exists
        self._load_analytics()
        
        logger.info(f"Enhanced OCR Engine initialized with {len(self.SUPPORTED_LANGUAGES)} languages")
    
    async def initialize(self) -> bool:
        """Initialize the OCR engine and its dependencies."""
        try:
            # Verify Tesseract installation
            import pytesseract
            pytesseract.get_tesseract_version()
            
            self.is_initialized = True
            logger.info("Enhanced OCR Engine initialized successfully")
            return True
        except Exception as e:
            logger.error(f"OCR Engine initialization failed: {e}")
            return False
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes."""
        return list(self.SUPPORTED_LANGUAGES.values())
    
    def get_confidence_threshold(self) -> float:
        """Get the minimum confidence threshold for this engine."""
        return self.min_confidence
    
    async def export_training_data(
        self, 
        image: np.ndarray,
        ground_truth: str,
        metadata: Dict[str, Any] = None
    ) -> TrainingData:
        """Export processed data in training format."""
        try:
            # Process image to get OCR result
            ocr_result = await self.process_image(image)
            
            # Calculate accuracy
            accuracy = self._calculate_text_similarity(ground_truth, ocr_result.text)
            
            # Create training data
            training_data = TrainingData(
                image_data=image.tobytes(),
                ground_truth=ground_truth,
                ocr_result=ocr_result.text,
                confidence=ocr_result.confidence,
                accuracy=accuracy,
                metadata=metadata or {},
                engine_name=self.engine_name,
                timestamp=datetime.now().isoformat()
            )
            
            return training_data
            
        except Exception as e:
            logger.error(f"Training data export failed: {e}")
            raise
    
    async def validate_model(
        self, 
        test_images: List[np.ndarray],
        ground_truths: List[str]
    ) -> Dict[str, float]:
        """Validate model performance against ground truth."""
        try:
            if len(test_images) != len(ground_truths):
                raise ValueError("Number of images must match number of ground truths")
            
            accuracies = []
            confidences = []
            processing_times = []
            
            for image, ground_truth in zip(test_images, ground_truths):
                start_time = time.time()
                result = await self.process_image(image)
                processing_time = time.time() - start_time
                
                accuracy = self._calculate_text_similarity(ground_truth, result.text)
                
                accuracies.append(accuracy)
                confidences.append(result.confidence)
                processing_times.append(processing_time)
            
            return {
                'mean_accuracy': statistics.mean(accuracies),
                'mean_confidence': statistics.mean(confidences),
                'mean_processing_time': statistics.mean(processing_times),
                'accuracy_std': statistics.stdev(accuracies) if len(accuracies) > 1 else 0,
                'total_samples': len(test_images)
            }
            
        except Exception as e:
            logger.error(f"Model validation failed: {e}")
            raise
    
    def _calculate_text_similarity(self, ground_truth: str, ocr_result: str) -> float:
        """Calculate similarity between ground truth and OCR result."""
        try:
            # Simple character-level accuracy
            ground_truth = ground_truth.strip().lower()
            ocr_result = ocr_result.strip().lower()
            
            if not ground_truth:
                return 0.0
            
            # Calculate Levenshtein distance-based accuracy
            from difflib import SequenceMatcher
            matcher = SequenceMatcher(None, ground_truth, ocr_result)
            return matcher.ratio() * 100
            
        except Exception as e:
            logger.warning(f"Text similarity calculation failed: {e}")
            return 0.0
    
    def _create_directories(self):
        """Create necessary directories."""
        Path(self.training_output_dir).mkdir(parents=True, exist_ok=True)
        Path(self.analytics_dir).mkdir(parents=True, exist_ok=True)
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
    
    def _load_analytics(self):
        """Load analytics from disk."""
        analytics_file = Path(self.analytics_dir) / "analytics.json"
        if analytics_file.exists():
            try:
                with open(analytics_file, 'r') as f:
                    saved_analytics = json.load(f)
                    self.analytics.update(saved_analytics)
                logger.info("Analytics loaded from disk")
            except Exception as e:
                logger.warning(f"Failed to load analytics: {e}")
    
    def _save_analytics(self):
        """Save analytics to disk."""
        analytics_file = Path(self.analytics_dir) / "analytics.json"
        try:
            # Convert defaultdicts to regular dicts for JSON serialization
            analytics_to_save = {
                'total_processed': self.analytics['total_processed'],
                'total_processing_time': self.analytics['total_processing_time'],
                'language_usage': dict(self.analytics['language_usage']),
                'confidence_scores': self.analytics['confidence_scores'][-1000:],  # Keep last 1000
                'error_counts': dict(self.analytics['error_counts']),
                'batch_sizes': self.analytics['batch_sizes'][-100:],  # Keep last 100
                'quality_metrics': self.analytics['quality_metrics'],
                'last_updated': datetime.now().isoformat()
            }
            
            with open(analytics_file, 'w') as f:
                json.dump(analytics_to_save, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save analytics: {e}")
    
    def _generate_cache_key(self, image_array: np.ndarray, language: str, config_name: str) -> str:
        """Generate cache key for image processing result."""
        if not self.enable_caching:
            return None
            
        # Create hash from image content, language, and config
        image_hash = hashlib.md5(image_array.tobytes()).hexdigest()
        cache_key = f"{image_hash}_{language}_{config_name}"
        return cache_key
    
    def _get_cached_result(self, cache_key: str) -> Optional[Dict]:
        """Get cached OCR result if available and not expired."""
        if not cache_key or not self.enable_caching:
            return None
            
        if cache_key in self.result_cache:
            cached_data = self.result_cache[cache_key]
            if time.time() - cached_data['timestamp'] < self.cache_ttl:
                return cached_data['result']
            else:
                # Remove expired cache
                del self.result_cache[cache_key]
        
        return None
    
    def _cache_result(self, cache_key: str, result: Dict):
        """Cache OCR result."""
        if not cache_key or not self.enable_caching:
            return
            
        self.result_cache[cache_key] = {
            'result': result,
            'timestamp': time.time()
        }
        
        # Limit cache size
        if len(self.result_cache) > 1000:
            # Remove oldest entries
            oldest_keys = sorted(
                self.result_cache.keys(),
                key=lambda k: self.result_cache[k]['timestamp']
            )[:100]
            for key in oldest_keys:
                del self.result_cache[key]
    
    def _detect_language(self, image_array: np.ndarray) -> Tuple[str, float]:
        """Detect the primary language in the image."""
        try:
            # Use Tesseract's built-in language detection
            osd = pytesseract.image_to_osd(image_array, config='--psm 0')
            
            # Parse OSD output to extract language information
            # This is a simplified approach - could be enhanced with ML models
            detected_lang = 'eng'  # Default to English
            confidence = 50.0  # Default confidence
            
            return detected_lang, confidence
            
        except Exception as e:
            logger.warning(f"Language detection failed: {e}")
            return 'eng', 30.0
    
    def _auto_select_config(self, image_array: np.ndarray) -> str:
        """Automatically select the best OCR configuration based on image analysis."""
        try:
            height, width = image_array.shape[:2]
            
            # Analyze image characteristics
            gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY) if len(image_array.shape) == 3 else image_array
            
            # Detect text regions
            contours, _ = cv2.findContours(
                cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            # Count significant text regions
            text_regions = len([c for c in contours if cv2.contourArea(c) > 100])
            
            # Determine best configuration
            if text_regions == 1:
                if height < 100:  # Likely single line
                    return 'single_line'
                elif width < 200:  # Likely single word
                    return 'single_word'
                else:
                    return 'single_block'
            elif text_regions < 5:
                return 'sparse_text'
            else:
                return 'document' if height > 800 else 'standard'
                
        except Exception as e:
            logger.warning(f"Auto config selection failed: {e}")
            return 'standard'
    
    def _calculate_quality_metrics(self, result: Dict) -> Dict[str, Any]:
        """Calculate quality metrics for OCR result."""
        try:
            words = result.get('words', [])
            if not words:
                return {'overall_quality': 'poor', 'confidence_distribution': {}}
            
            confidences = [w.get('confidence', 0) for w in words]
            avg_confidence = statistics.mean(confidences)
            
            # Confidence distribution
            high_conf = len([c for c in confidences if c >= self.high_confidence_threshold])
            medium_conf = len([c for c in confidences if 50 <= c < self.high_confidence_threshold])
            low_conf = len([c for c in confidences if c < 50])
            
            # Text quality indicators
            text = result.get('text', '')
            word_count = len(text.split())
            char_count = len(text)
            
            # Check for common OCR errors
            error_patterns = [
                r'[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}]',  # Special characters
                r'\d+[a-zA-Z]+\d+',  # Mixed numbers and letters
                r'[a-zA-Z]{1}[^a-zA-Z\s]{1}[a-zA-Z]+',  # Interrupted words
            ]
            
            error_count = sum(len(re.findall(pattern, text)) for pattern in error_patterns)
            error_rate = error_count / max(word_count, 1)
            
            # Overall quality assessment
            if avg_confidence >= self.high_confidence_threshold and error_rate < 0.1:
                overall_quality = 'excellent'
            elif avg_confidence >= 60 and error_rate < 0.2:
                overall_quality = 'good'
            elif avg_confidence >= 40 and error_rate < 0.4:
                overall_quality = 'fair'
            else:
                overall_quality = 'poor'
            
            return {
                'overall_quality': overall_quality,
                'average_confidence': avg_confidence,
                'confidence_distribution': {
                    'high': high_conf,
                    'medium': medium_conf,
                    'low': low_conf
                },
                'word_count': word_count,
                'character_count': char_count,
                'error_rate': error_rate,
                'quality_score': min(100, max(0, avg_confidence - error_rate * 50))
            }
            
        except Exception as e:
            logger.error(f"Quality metrics calculation failed: {e}")
            return {'overall_quality': 'unknown', 'error': str(e)}
    
    def _update_analytics(self, processing_time: float, language: str, 
                         confidence_scores: List[float], batch_size: int = 1):
        """Update analytics with processing results."""
        self.analytics['total_processed'] += batch_size
        self.analytics['total_processing_time'] += processing_time
        self.analytics['language_usage'][language] += batch_size
        self.analytics['confidence_scores'].extend(confidence_scores)
        self.analytics['batch_sizes'].append(batch_size)
        
        # Update quality metrics
        for score in confidence_scores:
            if score >= self.high_confidence_threshold:
                self.analytics['quality_metrics']['high_confidence'] += 1
            elif score >= 50:
                self.analytics['quality_metrics']['medium_confidence'] += 1
            else:
                self.analytics['quality_metrics']['low_confidence'] += 1
        
        # Save analytics periodically
        if self.analytics['total_processed'] % 10 == 0:
            self._save_analytics()
    
    async def process_image(self, image_array: np.ndarray, language: str = "eng", 
                          config_name: str = "auto") -> OCRResult:
        """
        Enhanced image processing with confidence scoring and analytics.
        
        Args:
            image_array: Input image as numpy array
            language: Language code or name
            config_name: OCR configuration to use ('auto' for automatic selection)
            
        Returns:
            Enhanced OCR result with confidence scores and quality metrics
        """
        start_time = time.time()
        
        try:
            # Normalize language input
            if language in self.SUPPORTED_LANGUAGES:
                tesseract_lang = self.SUPPORTED_LANGUAGES[language]
            elif language in self.SUPPORTED_LANGUAGES.values():
                tesseract_lang = language
            else:
                logger.warning(f"Unsupported language '{language}', using English")
                tesseract_lang = 'eng'
                language = 'english'
            
            # Auto-select configuration if needed
            if config_name == "auto":
                config_name = self._auto_select_config(image_array)
            
            # Check cache
            cache_key = self._generate_cache_key(image_array, tesseract_lang, config_name)
            cached_result = self._get_cached_result(cache_key)
            if cached_result:
                logger.info(f"Using cached result for {language} OCR")
                return OCRResult(**cached_result)
            
            # Get OCR configuration
            if config_name not in self.ocr_configs:
                config_name = 'standard'
                logger.warning(f"Unknown config '{config_name}', using standard")
            
            config = self.ocr_configs[config_name].copy()
            
            # Build Tesseract configuration string
            config_str = ' '.join([f'--{key} {value}' for key, value in config.items()])
            
            # Perform OCR with detailed data
            try:
                # Get detailed OCR data
                data = pytesseract.image_to_data(
                    image_array, 
                    lang=tesseract_lang, 
                    config=config_str,
                    output_type=pytesseract.Output.DICT
                )
                
                # Get plain text
                text = pytesseract.image_to_string(
                    image_array, 
                    lang=tesseract_lang, 
                    config=config_str
                ).strip()
                
            except Exception as e:
                logger.error(f"Tesseract processing failed: {e}")
                self.analytics['error_counts']['tesseract_error'] += 1
                raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
            
            # Process the detailed OCR data
            words = []
            lines = []
            paragraphs = []
            
            current_line_words = []
            current_paragraph_lines = []
            current_line_num = -1
            current_paragraph_num = -1
            
            confidences = []
            
            for i in range(len(data['text'])):
                if int(data['conf'][i]) < 0:  # Skip invalid detections
                    continue
                
                word_text = data['text'][i].strip()
                if not word_text:
                    continue
                
                confidence = float(data['conf'][i])
                confidences.append(confidence)
                
                # Create word object
                word = OCRWord(
                    text=word_text,
                    confidence=confidence,
                    bounding_box=BoundingBox(
                        x=int(data['left'][i]),
                        y=int(data['top'][i]),
                        width=int(data['width'][i]),
                        height=int(data['height'][i])
                    )
                )
                words.append(word)
                
                # Group words into lines
                line_num = int(data['line_num'][i])
                if line_num != current_line_num:
                    if current_line_words:
                        lines.append(OCRLine(
                            text=' '.join([w.text for w in current_line_words]),
                            words=current_line_words,
                            confidence=statistics.mean([w.confidence for w in current_line_words])
                        ))
                    current_line_words = [word]
                    current_line_num = line_num
                else:
                    current_line_words.append(word)
                
                # Group lines into paragraphs
                paragraph_num = int(data['par_num'][i])
                if paragraph_num != current_paragraph_num:
                    if current_paragraph_lines:
                        paragraphs.append(OCRParagraph(
                            text='\n'.join([l.text for l in current_paragraph_lines]),
                            lines=current_paragraph_lines,
                            confidence=statistics.mean([l.confidence for l in current_paragraph_lines])
                        ))
                    current_paragraph_lines = []
                    current_paragraph_num = paragraph_num
            
            # Add remaining line and paragraph
            if current_line_words:
                lines.append(OCRLine(
                    text=' '.join([w.text for w in current_line_words]),
                    words=current_line_words,
                    confidence=statistics.mean([w.confidence for w in current_line_words])
                ))
            
            if current_paragraph_lines:
                paragraphs.append(OCRParagraph(
                    text='\n'.join([l.text for l in current_paragraph_lines]),
                    lines=current_paragraph_lines,
                    confidence=statistics.mean([l.confidence for l in current_paragraph_lines])
                ))
            
            # Calculate overall confidence
            overall_confidence = statistics.mean(confidences) if confidences else 0
            
            processing_time = time.time() - start_time
            
            # Create result
            result_dict = {
                'text': text,
                'confidence': overall_confidence,
                'words': [w.__dict__ for w in words],
                'lines': [l.__dict__ for l in lines],
                'paragraphs': [p.__dict__ for p in paragraphs],
                'language': language,
                'processing_time': processing_time,
                'engine': self.engine_name,
                'config_used': config_name
            }
            
            # Calculate quality metrics
            quality_metrics = self._calculate_quality_metrics(result_dict)
            result_dict['quality_metrics'] = quality_metrics
            
            # Cache result
            self._cache_result(cache_key, result_dict)
            
            # Update analytics
            self._update_analytics(processing_time, language, confidences)
            
            result = OCRResult(**result_dict)
            
            logger.info(f"OCR completed: {len(text)} characters, "
                       f"{overall_confidence:.1f}% confidence, "
                       f"{processing_time:.2f}s, "
                       f"quality: {quality_metrics.get('overall_quality', 'unknown')}")
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.analytics['error_counts']['processing_error'] += 1
            logger.error(f"OCR processing failed after {processing_time:.2f}s: {e}")
            raise
    
    async def process_batch(self, images: List[np.ndarray], language: str = "eng",
                          config_name: str = "auto") -> List[OCRResult]:
        """
        Process multiple images in parallel with batch optimization.
        
        Args:
            images: List of image arrays
            language: Language code or name
            config_name: OCR configuration to use
            
        Returns:
            List of OCR results
        """
        start_time = time.time()
        batch_size = len(images)
        
        logger.info(f"Processing batch of {batch_size} images with {self.max_workers} workers")
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_index = {
                executor.submit(
                    asyncio.run,
                    self.process_image(image, language, config_name)
                ): idx
                for idx, image in enumerate(images)
            }
            
            # Collect results in order
            results = [None] * batch_size
            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    results[idx] = future.result()
                except Exception as e:
                    logger.error(f"Batch processing failed for image {idx}: {e}")
                    # Create error result
                    results[idx] = OCRResult(
                        text="",
                        confidence=0,
                        words=[],
                        lines=[],
                        paragraphs=[],
                        language=language,
                        processing_time=0,
                        engine=self.engine_name,
                        error=str(e)
                    )
        
        total_time = time.time() - start_time
        successful_results = [r for r in results if not hasattr(r, 'error')]
        
        logger.info(f"Batch processing completed: {len(successful_results)}/{batch_size} successful, "
                   f"{total_time:.2f}s total, {total_time/batch_size:.2f}s average per image")
        
        return results
    
    async def batch_process(
        self, 
        images: List[np.ndarray],
        language: str = "eng",
        options: Dict[str, Any] = None
    ) -> List[OCRResult]:
        """
        Process multiple images in batch for efficiency.
        Implementation of the abstract method from OCREngineInterface.
        
        Args:
            images: List of input images as numpy arrays
            language: Language code for OCR processing
            options: Additional processing options
            
        Returns:
            List of OCRResult objects
        """
        # Use the existing process_batch implementation
        config_name = "auto"
        if options and "config_name" in options:
            config_name = options["config_name"]
            
        return await self.process_batch(images, language, config_name)
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get comprehensive analytics data."""
        try:
            # Calculate derived metrics
            avg_processing_time = (
                self.analytics['total_processing_time'] / 
                max(self.analytics['total_processed'], 1)
            )
            
            confidence_stats = {}
            if self.analytics['confidence_scores']:
                scores = self.analytics['confidence_scores']
                confidence_stats = {
                    'mean': statistics.mean(scores),
                    'median': statistics.median(scores),
                    'min': min(scores),
                    'max': max(scores),
                    'std_dev': statistics.stdev(scores) if len(scores) > 1 else 0
                }
            
            # Most used languages
            top_languages = dict(
                Counter(self.analytics['language_usage']).most_common(5)
            )
            
            return {
                'summary': {
                    'total_processed': self.analytics['total_processed'],
                    'total_processing_time': self.analytics['total_processing_time'],
                    'average_processing_time': avg_processing_time,
                    'cache_hits': len(self.result_cache),
                    'supported_languages': len(self.SUPPORTED_LANGUAGES)
                },
                'confidence_statistics': confidence_stats,
                'quality_distribution': self.analytics['quality_metrics'],
                'language_usage': top_languages,
                'error_counts': dict(self.analytics['error_counts']),
                'performance': {
                    'average_batch_size': statistics.mean(self.analytics['batch_sizes']) if self.analytics['batch_sizes'] else 0,
                    'cache_enabled': self.enable_caching,
                    'max_workers': self.max_workers
                },
                'supported_languages': list(self.SUPPORTED_LANGUAGES.keys()),
                'available_configs': list(self.ocr_configs.keys()),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Analytics calculation failed: {e}")
            return {'error': str(e)}
    
    def get_language_support(self) -> Dict[str, str]:
        """Get supported languages mapping."""
        return self.SUPPORTED_LANGUAGES.copy()
    
    def get_available_configs(self) -> Dict[str, Dict]:
        """Get available OCR configurations."""
        return self.ocr_configs.copy()
    
    def reset_analytics(self):
        """Reset analytics data."""
        self.analytics = {
            'total_processed': 0,
            'total_processing_time': 0,
            'language_usage': defaultdict(int),
            'confidence_scores': [],
            'error_counts': defaultdict(int),
            'batch_sizes': [],
            'quality_metrics': {
                'high_confidence': 0,
                'medium_confidence': 0,
                'low_confidence': 0
            }
        }
        self.result_cache.clear()
        self._save_analytics()
        logger.info("Analytics reset completed")


# Initialize enhanced engine
logger = logging.getLogger(__name__)