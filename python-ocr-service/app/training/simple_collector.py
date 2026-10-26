"""
Simplified Training Data Collection Service

A streamlined version with proper type annotations for collecting OCR training data.
"""

import os
import json
import time
import hashlib
import sqlite3
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import cv2
import numpy as np
import logging


@dataclass
class TrainingDataPoint:
    """Individual training data point."""
    id: str
    image_path: str
    ground_truth: str
    ocr_result: str
    confidence: float
    language: str
    document_type: str
    created_at: float
    accuracy_score: float = 0.0


class TrainingDataCollectionService:
    """Simplified service for collecting OCR training data."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.data_dir = Path(self.config.get("data_directory", "./training_data"))
        self.db_path = self.data_dir / "training_data.db"
        self.images_dir = self.data_dir / "images"
        
        # Create directories
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger = logging.getLogger(__name__)
        self.db_connection: Optional[sqlite3.Connection] = None
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database for training data storage."""
        try:
            self.db_connection = sqlite3.connect(str(self.db_path), check_same_thread=False)
            cursor = self.db_connection.cursor()
            
            # Create training data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id TEXT PRIMARY KEY,
                    image_path TEXT NOT NULL,
                    ground_truth TEXT NOT NULL,
                    ocr_result TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    language TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    accuracy_score REAL DEFAULT 0.0
                )
            """)
            
            self.db_connection.commit()
            self.logger.info("Training data database initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def collect_training_sample(
        self,
        image: np.ndarray,
        ground_truth: str,
        ocr_result: str,
        confidence: float,
        language: str = "eng",
        document_type: str = "general",
        preprocessing_config: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Collect a single training sample.
        
        Returns:
            Sample ID for tracking
        """
        # Generate unique sample ID
        sample_id = self._generate_sample_id(image, ground_truth)
        
        # Save image
        image_filename = f"{sample_id}.png"
        image_path = self.images_dir / image_filename
        cv2.imwrite(str(image_path), image)
        
        # Calculate accuracy score
        accuracy_score = self._calculate_accuracy(ground_truth, ocr_result)
        
        # Create training data point
        training_sample = TrainingDataPoint(
            id=sample_id,
            image_path=str(image_path),
            ground_truth=ground_truth,
            ocr_result=ocr_result,
            confidence=confidence,
            language=language,
            document_type=document_type,
            created_at=time.time(),
            accuracy_score=accuracy_score
        )
        
        # Store in database
        await self._store_training_sample(training_sample)
        
        self.logger.info(f"Collected training sample: {sample_id} (accuracy: {accuracy_score:.1f}%)")
        return sample_id
    
    async def _store_training_sample(self, sample: TrainingDataPoint):
        """Store training sample in database."""
        if self.db_connection is None:
            raise RuntimeError("Database connection not initialized")
            
        cursor = self.db_connection.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO training_data (
                id, image_path, ground_truth, ocr_result, confidence,
                language, document_type, created_at, accuracy_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sample.id,
            sample.image_path,
            sample.ground_truth,
            sample.ocr_result,
            sample.confidence,
            sample.language,
            sample.document_type,
            sample.created_at,
            sample.accuracy_score
        ))
        
        self.db_connection.commit()
    
    def _generate_sample_id(self, image: np.ndarray, ground_truth: str) -> str:
        """Generate unique sample ID."""
        # Create hash from image and ground truth
        image_hash = hashlib.md5(image.tobytes()).hexdigest()[:8]
        text_hash = hashlib.md5(ground_truth.encode('utf-8')).hexdigest()[:8]
        timestamp = int(time.time() * 1000) % 1000000
        
        return f"sample_{image_hash}_{text_hash}_{timestamp}"
    
    def _calculate_accuracy(self, ground_truth: str, ocr_result: str) -> float:
        """Calculate accuracy score between ground truth and OCR result."""
        if not ground_truth:
            return 100.0 if not ocr_result else 0.0
        
        # Use character-level accuracy
        correct_chars = sum(1 for a, b in zip(ground_truth.lower(), ocr_result.lower()) if a == b)
        max_length = max(len(ground_truth), len(ocr_result))
        
        if max_length == 0:
            return 100.0
        
        return (correct_chars / max_length) * 100.0
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get training data collection statistics."""
        if self.db_connection is None:
            raise RuntimeError("Database connection not initialized")
            
        cursor = self.db_connection.cursor()
        
        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM training_data")
        total_samples = cursor.fetchone()[0]
        
        # Language distribution
        cursor.execute("""
            SELECT language, COUNT(*) 
            FROM training_data 
            GROUP BY language 
            ORDER BY COUNT(*) DESC
        """)
        language_dist = dict(cursor.fetchall())
        
        # Document type distribution
        cursor.execute("""
            SELECT document_type, COUNT(*) 
            FROM training_data 
            GROUP BY document_type 
            ORDER BY COUNT(*) DESC
        """)
        doc_type_dist = dict(cursor.fetchall())
        
        # Quality metrics
        cursor.execute("""
            SELECT 
                AVG(confidence) as avg_confidence,
                AVG(accuracy_score) as avg_accuracy,
                MIN(confidence) as min_confidence,
                MAX(confidence) as max_confidence,
                MIN(accuracy_score) as min_accuracy,
                MAX(accuracy_score) as max_accuracy
            FROM training_data
        """)
        quality_stats = cursor.fetchone()
        
        return {
            "total_samples": total_samples,
            "language_distribution": language_dist,
            "document_type_distribution": doc_type_dist,
            "quality_metrics": {
                "average_confidence": quality_stats[0] or 0,
                "average_accuracy": quality_stats[1] or 0,
                "confidence_range": [quality_stats[2] or 0, quality_stats[3] or 0],
                "accuracy_range": [quality_stats[4] or 0, quality_stats[5] or 0]
            }
        }
    
    def close(self):
        """Close database connection."""
        if self.db_connection:
            self.db_connection.close()