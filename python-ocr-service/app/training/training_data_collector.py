"""
Training Data Collection Service

Collects, organizes, and exports OCR training data with ground truth
for model improvement and custom model training.
"""

import os
import json
import time
import hashlib
import sqlite3
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import cv2
import numpy as np
from datetime import datetime
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
    preprocessing_config: Dict[str, Any]
    image_metadata: Dict[str, Any]
    created_at: float
    accuracy_score: float = 0.0
    validated: bool = False
    validation_notes: str = ""


@dataclass
class TrainingDataset:
    """Complete training dataset."""
    name: str
    description: str
    version: str
    language: str
    document_types: List[str]
    total_samples: int
    created_at: float
    metadata: Dict[str, Any]
    samples: List[TrainingDataPoint]


class TrainingDataCollectionService:
    """Service for collecting and managing OCR training data."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.data_dir = Path(self.config.get("data_directory", "./training_data"))
        self.db_path = self.data_dir / "training_data.db"
        self.images_dir = self.data_dir / "images"
        self.exports_dir = self.data_dir / "exports"
        
        # Create directories
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        
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
                    preprocessing_config TEXT NOT NULL,
                    image_metadata TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    accuracy_score REAL DEFAULT 0.0,
                    validated BOOLEAN DEFAULT FALSE,
                    validation_notes TEXT DEFAULT ''
                )
            """)
            
            # Create datasets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    name TEXT PRIMARY KEY,
                    description TEXT NOT NULL,
                    version TEXT NOT NULL,
                    language TEXT NOT NULL,
                    document_types TEXT NOT NULL,
                    total_samples INTEGER NOT NULL,
                    created_at REAL NOT NULL,
                    metadata TEXT NOT NULL
                )
            """)
            
            # Create dataset_samples table (many-to-many)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS dataset_samples (
                    dataset_name TEXT NOT NULL,
                    sample_id TEXT NOT NULL,
                    added_at REAL NOT NULL,
                    PRIMARY KEY (dataset_name, sample_id),
                    FOREIGN KEY (dataset_name) REFERENCES datasets (name),
                    FOREIGN KEY (sample_id) REFERENCES training_data (id)
                )
            """)
            
            # Create indexes for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_language 
                ON training_data (language)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_document_type 
                ON training_data (document_type)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_confidence 
                ON training_data (confidence)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_accuracy 
                ON training_data (accuracy_score)
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
        
        # Prepare image metadata
        image_metadata = {
            "shape": image.shape,
            "dtype": str(image.dtype),
            "size_bytes": image.nbytes,
            "channels": len(image.shape),
            **(metadata or {})
        }
        
        # Create training data point
        training_sample = TrainingDataPoint(
            id=sample_id,
            image_path=str(image_path),
            ground_truth=ground_truth,
            ocr_result=ocr_result,
            confidence=confidence,
            language=language,
            document_type=document_type,
            preprocessing_config=preprocessing_config or {},
            image_metadata=image_metadata,
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
                language, document_type, preprocessing_config, image_metadata,
                created_at, accuracy_score, validated, validation_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sample.id,
            sample.image_path,
            sample.ground_truth,
            sample.ocr_result,
            sample.confidence,
            sample.language,
            sample.document_type,
            json.dumps(sample.preprocessing_config),
            json.dumps(sample.image_metadata),
            sample.created_at,
            sample.accuracy_score,
            sample.validated,
            sample.validation_notes
        ))
        
        self.db_connection.commit()
    
    async def create_dataset(
        self,
        name: str,
        description: str,
        version: str = "1.0.0",
        language: str = "eng",
        document_types: List[str] = None,
        filters: Dict[str, Any] = None
    ) -> TrainingDataset:
        """
        Create a training dataset from collected samples.
        
        Args:
            name: Dataset name
            description: Dataset description
            version: Dataset version
            language: Primary language
            document_types: Document types to include
            filters: Additional filters for sample selection
            
        Returns:
            Created dataset
        """
        filters = filters or {}
        document_types = document_types or ["general"]
        
        # Query samples based on criteria
        samples = await self._query_samples(
            language=language,
            document_types=document_types,
            **filters
        )
        
        # Create dataset
        dataset = TrainingDataset(
            name=name,
            description=description,
            version=version,
            language=language,
            document_types=document_types,
            total_samples=len(samples),
            created_at=time.time(),
            metadata={
                "filters_applied": filters,
                "avg_confidence": sum(s.confidence for s in samples) / len(samples) if samples else 0,
                "avg_accuracy": sum(s.accuracy_score for s in samples) / len(samples) if samples else 0,
                "confidence_range": [min(s.confidence for s in samples), max(s.confidence for s in samples)] if samples else [0, 0],
                "accuracy_range": [min(s.accuracy_score for s in samples), max(s.accuracy_score for s in samples)] if samples else [0, 0]
            },
            samples=samples
        )
        
        # Store dataset in database
        await self._store_dataset(dataset)
        
        self.logger.info(f"Created dataset '{name}' with {len(samples)} samples")
        return dataset
    
    async def _store_dataset(self, dataset: TrainingDataset):
        """Store dataset metadata in database."""
        cursor = self.db_connection.cursor()
        
        # Store dataset
        cursor.execute("""
            INSERT OR REPLACE INTO datasets (
                name, description, version, language, document_types,
                total_samples, created_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dataset.name,
            dataset.description,
            dataset.version,
            dataset.language,
            json.dumps(dataset.document_types),
            dataset.total_samples,
            dataset.created_at,
            json.dumps(dataset.metadata)
        ))
        
        # Store dataset-sample relationships
        for sample in dataset.samples:
            cursor.execute("""
                INSERT OR REPLACE INTO dataset_samples (
                    dataset_name, sample_id, added_at
                ) VALUES (?, ?, ?)
            """, (dataset.name, sample.id, time.time()))
        
        self.db_connection.commit()
    
    async def _query_samples(
        self,
        language: str = None,
        document_types: List[str] = None,
        min_confidence: float = None,
        max_confidence: float = None,
        min_accuracy: float = None,
        max_accuracy: float = None,
        validated_only: bool = False,
        limit: int = None
    ) -> List[TrainingDataPoint]:
        """Query training samples with filters."""
        cursor = self.db_connection.cursor()
        
        # Build WHERE clause
        conditions = []
        params = []
        
        if language:
            conditions.append("language = ?")
            params.append(language)
        
        if document_types:
            placeholders = ",".join("?" * len(document_types))
            conditions.append(f"document_type IN ({placeholders})")
            params.extend(document_types)
        
        if min_confidence is not None:
            conditions.append("confidence >= ?")
            params.append(min_confidence)
        
        if max_confidence is not None:
            conditions.append("confidence <= ?")
            params.append(max_confidence)
        
        if min_accuracy is not None:
            conditions.append("accuracy_score >= ?")
            params.append(min_accuracy)
        
        if max_accuracy is not None:
            conditions.append("accuracy_score <= ?")
            params.append(max_accuracy)
        
        if validated_only:
            conditions.append("validated = TRUE")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # Build query
        query = f"""
            SELECT * FROM training_data 
            WHERE {where_clause}
            ORDER BY created_at DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Convert to TrainingDataPoint objects
        samples = []
        for row in rows:
            sample = TrainingDataPoint(
                id=row[0],
                image_path=row[1],
                ground_truth=row[2],
                ocr_result=row[3],
                confidence=row[4],
                language=row[5],
                document_type=row[6],
                preprocessing_config=json.loads(row[7]),
                image_metadata=json.loads(row[8]),
                created_at=row[9],
                accuracy_score=row[10],
                validated=bool(row[11]),
                validation_notes=row[12]
            )
            samples.append(sample)
        
        return samples
    
    async def export_dataset(
        self,
        dataset_name: str,
        format_type: str = "tesseract",
        output_dir: str = None
    ) -> Dict[str, Any]:
        """
        Export dataset in specified format for training.
        
        Args:
            dataset_name: Name of dataset to export
            format_type: Export format (tesseract, tensorflow, pytorch, etc.)
            output_dir: Output directory (default: exports/{dataset_name})
            
        Returns:
            Export information
        """
        if output_dir is None:
            output_dir = self.exports_dir / dataset_name
        else:
            output_dir = Path(output_dir)
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load dataset
        dataset = await self._load_dataset(dataset_name)
        if not dataset:
            raise ValueError(f"Dataset '{dataset_name}' not found")
        
        if format_type == "tesseract":
            return await self._export_tesseract_format(dataset, output_dir)
        elif format_type == "tensorflow":
            return await self._export_tensorflow_format(dataset, output_dir)
        elif format_type == "pytorch":
            return await self._export_pytorch_format(dataset, output_dir)
        elif format_type == "json":
            return await self._export_json_format(dataset, output_dir)
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    async def _load_dataset(self, name: str) -> Optional[TrainingDataset]:
        """Load dataset from database."""
        cursor = self.db_connection.cursor()
        
        # Load dataset metadata
        cursor.execute("SELECT * FROM datasets WHERE name = ?", (name,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        # Load samples
        cursor.execute("""
            SELECT td.* FROM training_data td
            JOIN dataset_samples ds ON td.id = ds.sample_id
            WHERE ds.dataset_name = ?
            ORDER BY td.created_at
        """, (name,))
        
        sample_rows = cursor.fetchall()
        samples = []
        
        for sample_row in sample_rows:
            sample = TrainingDataPoint(
                id=sample_row[0],
                image_path=sample_row[1],
                ground_truth=sample_row[2],
                ocr_result=sample_row[3],
                confidence=sample_row[4],
                language=sample_row[5],
                document_type=sample_row[6],
                preprocessing_config=json.loads(sample_row[7]),
                image_metadata=json.loads(sample_row[8]),
                created_at=sample_row[9],
                accuracy_score=sample_row[10],
                validated=bool(sample_row[11]),
                validation_notes=sample_row[12]
            )
            samples.append(sample)
        
        # Create dataset object
        dataset = TrainingDataset(
            name=row[0],
            description=row[1],
            version=row[2],
            language=row[3],
            document_types=json.loads(row[4]),
            total_samples=row[5],
            created_at=row[6],
            metadata=json.loads(row[7]),
            samples=samples
        )
        
        return dataset
    
    async def _export_tesseract_format(self, dataset: TrainingDataset, output_dir: Path) -> Dict[str, Any]:
        """Export in Tesseract training format."""
        # Create directory structure
        images_dir = output_dir / "images"
        gt_dir = output_dir / "ground_truth"
        images_dir.mkdir(exist_ok=True)
        gt_dir.mkdir(exist_ok=True)
        
        exported_files = []
        
        for i, sample in enumerate(dataset.samples):
            # Copy image
            image = cv2.imread(sample.image_path)
            if image is not None:
                image_filename = f"{dataset.name}_{i:06d}.png"
                image_path = images_dir / image_filename
                cv2.imwrite(str(image_path), image)
                
                # Create ground truth file
                gt_filename = f"{dataset.name}_{i:06d}.gt.txt"
                gt_path = gt_dir / gt_filename
                with open(gt_path, 'w', encoding='utf-8') as f:
                    f.write(sample.ground_truth)
                
                exported_files.append({
                    "image": str(image_path),
                    "ground_truth": str(gt_path),
                    "sample_id": sample.id
                })
        
        # Create training configuration
        config = {
            "dataset_name": dataset.name,
            "language": dataset.language,
            "total_samples": len(exported_files),
            "export_format": "tesseract",
            "exported_at": time.time(),
            "files": exported_files
        }
        
        config_path = output_dir / "training_config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        return {
            "format": "tesseract",
            "output_directory": str(output_dir),
            "config_file": str(config_path),
            "samples_exported": len(exported_files),
            "images_directory": str(images_dir),
            "ground_truth_directory": str(gt_dir)
        }
    
    async def _export_json_format(self, dataset: TrainingDataset, output_dir: Path) -> Dict[str, Any]:
        """Export in JSON format."""
        # Convert dataset to dict
        dataset_dict = asdict(dataset)
        
        # Save dataset
        dataset_file = output_dir / f"{dataset.name}_dataset.json"
        with open(dataset_file, 'w', encoding='utf-8') as f:
            json.dump(dataset_dict, f, indent=2, ensure_ascii=False)
        
        return {
            "format": "json",
            "output_directory": str(output_dir),
            "dataset_file": str(dataset_file),
            "samples_exported": dataset.total_samples
        }
    
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
        cursor = self.db_connection.cursor()
        
        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM training_data")
        total_samples = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM datasets")
        total_datasets = cursor.fetchone()[0]
        
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
        
        # Validation status
        cursor.execute("""
            SELECT validated, COUNT(*) 
            FROM training_data 
            GROUP BY validated
        """)
        validation_stats = dict(cursor.fetchall())
        
        return {
            "total_samples": total_samples,
            "total_datasets": total_datasets,
            "language_distribution": language_dist,
            "document_type_distribution": doc_type_dist,
            "quality_metrics": {
                "average_confidence": quality_stats[0] or 0,
                "average_accuracy": quality_stats[1] or 0,
                "confidence_range": [quality_stats[2] or 0, quality_stats[3] or 0],
                "accuracy_range": [quality_stats[4] or 0, quality_stats[5] or 0]
            },
            "validation_status": {
                "validated": validation_stats.get(1, 0),
                "unvalidated": validation_stats.get(0, 0)
            }
        }
    
    def close(self):
        """Close database connection."""
        if self.db_connection:
            self.db_connection.close()