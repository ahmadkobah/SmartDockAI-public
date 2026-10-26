"""
Abstract OCR Engine Interface

This module defines the abstract base class for all OCR engines.
All OCR implementations must inherit from this interface to ensure
consistency and enable seamless engine swapping.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np


@dataclass
class BoundingBox:
    """Represents a bounding box with coordinates and dimensions."""
    x: int
    y: int
    width: int
    height: int
    confidence: float = 0.0


@dataclass
class OCRWord:
    """Represents a single word detected by OCR."""
    text: str
    confidence: float
    bbox: BoundingBox
    

@dataclass
class OCRLine:
    """Represents a line of text detected by OCR."""
    text: str
    confidence: float
    bbox: BoundingBox
    words: List[OCRWord]


@dataclass
class OCRParagraph:
    """Represents a paragraph detected by OCR."""
    text: str
    confidence: float
    bbox: BoundingBox
    lines: List[OCRLine]


@dataclass
class OCRResult:
    """Complete OCR result with hierarchical text structure."""
    text: str
    confidence: float
    words: List[OCRWord]
    lines: List[OCRLine]
    paragraphs: List[OCRParagraph]
    language: str
    processing_time: float
    engine_version: str
    metadata: Dict[str, Any]


@dataclass
class TrainingData:
    """Training data export format."""
    image_path: str
    ground_truth_text: str
    ocr_result: OCRResult
    preprocessing_config: Dict[str, Any]
    training_metadata: Dict[str, Any]


class OCREngineInterface(ABC):
    """Abstract base class for all OCR engines."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the OCR engine with configuration."""
        self.config = config or {}
        self.is_initialized = False
        self.engine_name = "base_engine"
        self.version = "1.0.0"
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the OCR engine and its dependencies."""
        pass
    
    @abstractmethod
    async def process_image(
        self, 
        image: np.ndarray, 
        language: str = "eng",
        options: Dict[str, Any] = None
    ) -> OCRResult:
        """
        Process an image and extract text using OCR.
        
        Args:
            image: Input image as numpy array
            language: Language code for OCR processing
            options: Additional processing options
            
        Returns:
            OCRResult containing extracted text and metadata
        """
        pass
    
    @abstractmethod
    async def batch_process(
        self, 
        images: List[np.ndarray],
        language: str = "eng",
        options: Dict[str, Any] = None
    ) -> List[OCRResult]:
        """
        Process multiple images in batch for efficiency.
        
        Args:
            images: List of input images as numpy arrays
            language: Language code for OCR processing
            options: Additional processing options
            
        Returns:
            List of OCRResult objects
        """
        pass
    
    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes."""
        pass
    
    @abstractmethod
    def get_confidence_threshold(self) -> float:
        """Get the minimum confidence threshold for this engine."""
        pass
    
    @abstractmethod
    async def export_training_data(
        self, 
        image: np.ndarray,
        ground_truth: str,
        metadata: Dict[str, Any] = None
    ) -> TrainingData:
        """
        Export processed data in training format.
        
        Args:
            image: Input image
            ground_truth: Correct text for this image
            metadata: Additional metadata for training
            
        Returns:
            TrainingData object ready for model training
        """
        pass
    
    @abstractmethod
    async def validate_model(
        self, 
        test_images: List[np.ndarray],
        ground_truths: List[str]
    ) -> Dict[str, float]:
        """
        Validate model performance against ground truth.
        
        Args:
            test_images: Test images
            ground_truths: Expected text outputs
            
        Returns:
            Dictionary with validation metrics
        """
        pass
    
    def get_engine_info(self) -> Dict[str, Any]:
        """Get engine information and configuration."""
        return {
            "name": self.engine_name,
            "version": self.version,
            "initialized": self.is_initialized,
            "config": self.config,
            "supported_languages": self.get_supported_languages(),
            "confidence_threshold": self.get_confidence_threshold()
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the OCR engine."""
        return {
            "status": "healthy" if self.is_initialized else "not_initialized",
            "engine": self.engine_name,
            "version": self.version,
            "timestamp": __import__("time").time()
        }