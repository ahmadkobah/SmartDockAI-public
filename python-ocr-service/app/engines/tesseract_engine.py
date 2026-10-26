"""
Tesseract OCR Engine Implementation

High-performance Tesseract implementation with training data export
capabilities and advanced configuration options.
"""

import time
import cv2
import numpy as np
import pytesseract
from PIL import Image
from typing import Dict, List, Any, Optional
import logging
import json
import os
from pathlib import Path

from .base_engine import (
    OCREngineInterface, 
    OCRResult, 
    OCRWord, 
    OCRLine, 
    OCRParagraph, 
    BoundingBox,
    TrainingData
)


class TesseractEngine(OCREngineInterface):
    """Advanced Tesseract OCR engine with training capabilities."""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.engine_name = "tesseract"
        self.version = "5.0+"
        
        # Tesseract configuration
        self.tesseract_cmd = config.get("tesseract_cmd", "tesseract")
        self.data_path = config.get("data_path", None)
        self.training_output_dir = config.get("training_output_dir", "./training_data")
        
        # OCR Configuration
        self.default_config = config.get("tesseract_config", {
            "oem": 1,  # LSTM OCR Engine Mode
            "psm": 3,  # Fully automatic page segmentation
            "preserve_interword_spaces": 1,
            "load_system_dawg": 0,
            "load_freq_dawg": 0
        })
        
        # Language models
        self.supported_languages = [
            "eng", "deu", "fra", "spa", "ita", "por", "rus", "ara", "chi_sim", "chi_tra", "jpn", "kor"
        ]
        
        # Training configuration
        self.training_counter = 0
        self.confidence_threshold = 60.0
        
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self) -> bool:
        """Initialize Tesseract engine and verify installation."""
        try:
            self.logger.info("Initializing Tesseract OCR Engine...")
            
            # Set Tesseract command path if provided
            if self.tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
            
            # Test Tesseract installation
            version = pytesseract.get_tesseract_version()
            self.logger.info(f"Tesseract version: {version}")
            
            # Verify supported languages
            available_langs = pytesseract.get_languages()
            missing_langs = set(self.supported_languages) - set(available_langs)
            if missing_langs:
                self.logger.warning(f"Missing language packs: {missing_langs}")
            
            # Create training output directory
            Path(self.training_output_dir).mkdir(parents=True, exist_ok=True)
            
            self.is_initialized = True
            self.logger.info("✅ Tesseract OCR Engine initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Tesseract: {e}")
            return False
    
    async def process_image(
        self, 
        image: np.ndarray, 
        language: str = "eng",
        options: Dict[str, Any] = None
    ) -> OCRResult:
        """Process a single image with Tesseract OCR."""
        start_time = time.time()
        options = options or {}
        
        try:
            # Convert numpy array to PIL Image
            if len(image.shape) == 3:
                pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            else:
                pil_image = Image.fromarray(image)
            
            # Build Tesseract configuration
            config = self._build_tesseract_config(options)
            
            # Extract text with detailed data
            ocr_data = pytesseract.image_to_data(
                pil_image, 
                lang=language, 
                config=config,
                output_type=pytesseract.Output.DICT
            )
            
            # Extract full text
            full_text = pytesseract.image_to_string(
                pil_image,
                lang=language,
                config=config
            ).strip()
            
            # Process OCR data into structured format
            words, lines, paragraphs = self._process_ocr_data(ocr_data)
            
            # Calculate overall confidence
            word_confidences = [word.confidence for word in words if word.confidence > 0]
            overall_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else 0.0
            
            processing_time = time.time() - start_time
            
            result = OCRResult(
                text=full_text,
                confidence=overall_confidence,
                words=words,
                lines=lines,
                paragraphs=paragraphs,
                language=language,
                processing_time=processing_time,
                engine_version=self.version,
                metadata={
                    "tesseract_config": config,
                    "image_dimensions": image.shape,
                    "word_count": len(words),
                    "line_count": len(lines),
                    "paragraph_count": len(paragraphs)
                }
            )
            
            self.logger.info(f"OCR completed: {len(full_text)} chars, {overall_confidence:.1f}% confidence")
            return result
            
        except Exception as e:
            self.logger.error(f"OCR processing failed: {e}")
            raise
    
    async def batch_process(
        self, 
        images: List[np.ndarray],
        language: str = "eng",
        options: Dict[str, Any] = None
    ) -> List[OCRResult]:
        """Process multiple images in batch."""
        results = []
        
        for i, image in enumerate(images):
            try:
                result = await self.process_image(image, language, options)
                results.append(result)
                self.logger.info(f"Processed batch image {i+1}/{len(images)}")
            except Exception as e:
                self.logger.error(f"Failed to process batch image {i+1}: {e}")
                # Create empty result for failed image
                results.append(OCRResult(
                    text="", confidence=0.0, words=[], lines=[], paragraphs=[],
                    language=language, processing_time=0.0, engine_version=self.version,
                    metadata={"error": str(e)}
                ))
        
        return results
    
    def get_supported_languages(self) -> List[str]:
        """Get supported language codes."""
        return self.supported_languages.copy()
    
    def get_confidence_threshold(self) -> float:
        """Get minimum confidence threshold."""
        return self.confidence_threshold
    
    async def export_training_data(
        self, 
        image: np.ndarray,
        ground_truth: str,
        metadata: Dict[str, Any] = None
    ) -> TrainingData:
        """Export training data for model improvement."""
        self.training_counter += 1
        
        # Process image with OCR
        ocr_result = await self.process_image(image, metadata.get("language", "eng"))
        
        # Save training image
        training_id = f"training_{self.training_counter:06d}"
        image_filename = f"{training_id}.png"
        image_path = os.path.join(self.training_output_dir, image_filename)
        
        cv2.imwrite(image_path, image)
        
        # Create training data structure
        training_data = TrainingData(
            image_path=image_path,
            ground_truth_text=ground_truth,
            ocr_result=ocr_result,
            preprocessing_config=metadata.get("preprocessing", {}),
            training_metadata={
                "training_id": training_id,
                "timestamp": time.time(),
                "image_shape": image.shape,
                "ground_truth_length": len(ground_truth),
                "ocr_accuracy": self._calculate_accuracy(ground_truth, ocr_result.text),
                **(metadata or {})
            }
        )
        
        # Save training metadata
        metadata_path = os.path.join(self.training_output_dir, f"{training_id}.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump({
                "image_path": image_path,
                "ground_truth": ground_truth,
                "ocr_text": ocr_result.text,
                "ocr_confidence": ocr_result.confidence,
                "metadata": training_data.training_metadata
            }, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Exported training data: {training_id}")
        return training_data
    
    async def validate_model(
        self, 
        test_images: List[np.ndarray],
        ground_truths: List[str]
    ) -> Dict[str, float]:
        """Validate model performance."""
        if len(test_images) != len(ground_truths):
            raise ValueError("Number of images and ground truths must match")
        
        total_accuracy = 0.0
        total_confidence = 0.0
        character_accuracy = 0.0
        word_accuracy = 0.0
        
        for image, truth in zip(test_images, ground_truths):
            result = await self.process_image(image)
            accuracy = self._calculate_accuracy(truth, result.text)
            char_acc = self._calculate_character_accuracy(truth, result.text)
            word_acc = self._calculate_word_accuracy(truth, result.text)
            
            total_accuracy += accuracy
            total_confidence += result.confidence
            character_accuracy += char_acc
            word_accuracy += word_acc
        
        count = len(test_images)
        return {
            "overall_accuracy": total_accuracy / count,
            "average_confidence": total_confidence / count,
            "character_accuracy": character_accuracy / count,
            "word_accuracy": word_accuracy / count,
            "test_samples": count
        }
    
    def _build_tesseract_config(self, options: Dict[str, Any]) -> str:
        """Build Tesseract configuration string."""
        config = {**self.default_config, **options}
        
        config_parts = []
        for key, value in config.items():
            if isinstance(value, bool):
                config_parts.append(f"-c {key}={'1' if value else '0'}")
            else:
                config_parts.append(f"-c {key}={value}")
        
        return " ".join(config_parts)
    
    def _process_ocr_data(self, ocr_data: Dict) -> tuple:
        """Process raw OCR data into structured objects."""
        words = []
        lines = []
        paragraphs = []
        
        # Group data by hierarchy
        current_line_words = []
        current_para_lines = []
        current_line_text = ""
        current_para_text = ""
        
        prev_line_num = -1
        prev_para_num = -1
        
        for i in range(len(ocr_data['text'])):
            if int(ocr_data['conf'][i]) < 0:  # Skip invalid detections
                continue
                
            text = ocr_data['text'][i].strip()
            if not text:
                continue
            
            confidence = float(ocr_data['conf'][i])
            line_num = ocr_data['line_num'][i]
            para_num = ocr_data['par_num'][i]
            
            # Create word object
            word = OCRWord(
                text=text,
                confidence=confidence,
                bbox=BoundingBox(
                    x=ocr_data['left'][i],
                    y=ocr_data['top'][i],
                    width=ocr_data['width'][i],
                    height=ocr_data['height'][i],
                    confidence=confidence
                )
            )
            words.append(word)
            
            # Handle line changes
            if line_num != prev_line_num and current_line_words:
                line = OCRLine(
                    text=current_line_text.strip(),
                    confidence=sum(w.confidence for w in current_line_words) / len(current_line_words),
                    bbox=self._calculate_bounding_box([w.bbox for w in current_line_words]),
                    words=current_line_words.copy()
                )
                lines.append(line)
                current_para_lines.append(line)
                current_line_words = []
                current_line_text = ""
            
            # Handle paragraph changes
            if para_num != prev_para_num and current_para_lines:
                paragraph = OCRParagraph(
                    text=current_para_text.strip(),
                    confidence=sum(l.confidence for l in current_para_lines) / len(current_para_lines),
                    bbox=self._calculate_bounding_box([l.bbox for l in current_para_lines]),
                    lines=current_para_lines.copy()
                )
                paragraphs.append(paragraph)
                current_para_lines = []
                current_para_text = ""
            
            # Add to current structures
            current_line_words.append(word)
            current_line_text += text + " "
            current_para_text += text + " "
            
            prev_line_num = line_num
            prev_para_num = para_num
        
        # Handle final line and paragraph
        if current_line_words:
            line = OCRLine(
                text=current_line_text.strip(),
                confidence=sum(w.confidence for w in current_line_words) / len(current_line_words),
                bbox=self._calculate_bounding_box([w.bbox for w in current_line_words]),
                words=current_line_words
            )
            lines.append(line)
            current_para_lines.append(line)
        
        if current_para_lines:
            paragraph = OCRParagraph(
                text=current_para_text.strip(),
                confidence=sum(l.confidence for l in current_para_lines) / len(current_para_lines),
                bbox=self._calculate_bounding_box([l.bbox for l in current_para_lines]),
                lines=current_para_lines
            )
            paragraphs.append(paragraph)
        
        return words, lines, paragraphs
    
    def _calculate_bounding_box(self, bboxes: List[BoundingBox]) -> BoundingBox:
        """Calculate combined bounding box from multiple boxes."""
        if not bboxes:
            return BoundingBox(0, 0, 0, 0)
        
        min_x = min(bbox.x for bbox in bboxes)
        min_y = min(bbox.y for bbox in bboxes)
        max_x = max(bbox.x + bbox.width for bbox in bboxes)
        max_y = max(bbox.y + bbox.height for bbox in bboxes)
        
        avg_confidence = sum(bbox.confidence for bbox in bboxes) / len(bboxes)
        
        return BoundingBox(
            x=min_x,
            y=min_y,
            width=max_x - min_x,
            height=max_y - min_y,
            confidence=avg_confidence
        )
    
    def _calculate_accuracy(self, ground_truth: str, ocr_text: str) -> float:
        """Calculate simple accuracy between ground truth and OCR result."""
        if not ground_truth:
            return 100.0 if not ocr_text else 0.0
        
        # Simple Levenshtein distance based accuracy
        import difflib
        ratio = difflib.SequenceMatcher(None, ground_truth.lower(), ocr_text.lower()).ratio()
        return ratio * 100.0
    
    def _calculate_character_accuracy(self, ground_truth: str, ocr_text: str) -> float:
        """Calculate character-level accuracy."""
        if not ground_truth:
            return 100.0 if not ocr_text else 0.0
        
        correct_chars = sum(1 for a, b in zip(ground_truth.lower(), ocr_text.lower()) if a == b)
        max_length = max(len(ground_truth), len(ocr_text))
        return (correct_chars / max_length) * 100.0 if max_length > 0 else 0.0
    
    def _calculate_word_accuracy(self, ground_truth: str, ocr_text: str) -> float:
        """Calculate word-level accuracy."""
        truth_words = set(ground_truth.lower().split())
        ocr_words = set(ocr_text.lower().split())
        
        if not truth_words:
            return 100.0 if not ocr_words else 0.0
        
        correct_words = len(truth_words.intersection(ocr_words))
        return (correct_words / len(truth_words)) * 100.0