"""
ICR (Intelligent Character Recognition) Service

FastAPI-based microservice for handwriting recognition and processing.
Specialized for handwritten text, signatures, and forms.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import numpy as np
import cv2
import io
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import os
from pathlib import Path

# Local imports
from app.models.trocr_model import TrOCRHandwritingModel
from app.preprocessing.handwriting_processor import HandwritingPreprocessor
from app.training.training_data_collector import TrainingDataCollector

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SmartDockAI ICR Service",
    description="Intelligent Character Recognition service for handwriting, signatures, and forms",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model instances
icr_model: Optional[TrOCRHandwritingModel] = None
preprocessor: Optional[HandwritingPreprocessor] = None
training_collector: Optional[TrainingDataCollector] = None

# Configuration
ICR_CONFIG = {
    "model_path": os.getenv("ICR_MODEL_PATH", "./models"),
    "training_data_path": os.getenv("TRAINING_DATA_PATH", "./training_data"),
    "max_image_size": int(os.getenv("MAX_IMAGE_SIZE", "2048")),
    "supported_formats": ["png", "jpg", "jpeg", "tiff", "bmp"],
    "preprocessing": {
        "noise_reduction": "medium",
        "skew_detection": True,
        "min_line_height": 20,
        "max_line_height": 200
    }
}


async def get_icr_model() -> TrOCRHandwritingModel:
    """Dependency to get ICR model instance."""
    global icr_model
    if icr_model is None:
        icr_model = TrOCRHandwritingModel()
        # Initialize model
        await icr_model.load_model()  # Use async load_model and correct variable name
        logger.info("ICR model initialized")
    return icr_model


async def get_preprocessor() -> HandwritingPreprocessor:
    """Dependency to get handwriting preprocessor instance."""
    global preprocessor
    if preprocessor is None:
        preprocessor = HandwritingPreprocessor(ICR_CONFIG["preprocessing"])
        logger.info("Handwriting preprocessor initialized")
    return preprocessor


async def get_training_collector() -> TrainingDataCollector:
    """Dependency to get training data collector instance."""
    global training_collector
    if training_collector is None:
        training_collector = TrainingDataCollector(
            data_dir=ICR_CONFIG["training_data_path"]
        )
        logger.info("Training data collector initialized")
    return training_collector


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting ICR Service...")
    
    # Create necessary directories
    os.makedirs(ICR_CONFIG["model_path"], exist_ok=True)
    os.makedirs(ICR_CONFIG["training_data_path"], exist_ok=True)
    
    # Initialize models
    await get_icr_model()
    await get_preprocessor()
    await get_training_collector()
    
    logger.info("ICR Service startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down ICR Service...")


def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded image file."""
    if not file.filename:
        return False
    
    file_extension = file.filename.split('.')[-1].lower()
    return file_extension in ICR_CONFIG["supported_formats"]


async def load_image_from_upload(file: UploadFile) -> np.ndarray:
    """Load image from uploaded file."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        # Resize if too large
        height, width = image.shape[:2]
        max_size = ICR_CONFIG["max_image_size"]
        
        if max(height, width) > max_size:
            scale = max_size / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        return image
        
    except Exception as e:
        logger.error(f"Error loading image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "SmartDockAI ICR Service",
        "version": "1.0.0",
        "status": "active",
        "capabilities": [
            "handwriting_recognition",
            "signature_verification", 
            "form_processing",
            "character_segmentation",
            "training_data_collection"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        model = await get_icr_model()
        preprocessor = await get_preprocessor()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "icr_model": "ready" if model else "unavailable",
                "preprocessor": "ready" if preprocessor else "unavailable"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@app.post("/recognize")
async def recognize_handwriting(
    file: UploadFile = File(...),
    recognition_type: str = "full_text",
    preprocess: bool = True,
    model: TrOCRHandwritingModel = Depends(get_icr_model),
    preprocessor: HandwritingPreprocessor = Depends(get_preprocessor)
):
    """
    Recognize handwriting from uploaded image.
    
    Args:
        file: Image file containing handwriting
        recognition_type: Type of recognition (full_text, line_by_line, word_by_word)
        preprocess: Whether to apply preprocessing
    """
    if not validate_image_file(file):
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    try:
        # Load image
        image = await load_image_from_upload(file)
        
        # Preprocess if requested
        preprocessed_image = image
        preprocessing_metadata = {}
        
        if preprocess:
            results = await preprocessor.preprocess_handwriting(image, "line_recognition")
            preprocessed_image = results["preprocessed_image"]
            preprocessing_metadata = results["metadata"]
        
        # Perform recognition based on type
        if recognition_type == "full_text":
            # Process entire image as one
            recognition_result = await model.predict(preprocessed_image)
            
            return {
                "recognized_text": recognition_result.text,
                "confidence": recognition_result.confidence,
                "recognition_type": recognition_type,
                "preprocessing_applied": preprocess,
                "preprocessing_metadata": preprocessing_metadata,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        elif recognition_type == "line_by_line":
            # Process each line separately
            if not preprocess:
                results = await preprocessor.preprocess_handwriting(image, "line_recognition")
            
            line_results = []
            for i, line_segment in enumerate(results["line_segments"]):
                line_recognition = await model.predict(line_segment.image)
                line_results.append({
                    "line_index": i,
                    "text": line_recognition.text,
                    "confidence": line_recognition.confidence,
                    "bbox": line_segment.bbox
                })
            
            return {
                "lines": line_results,
                "total_lines": len(line_results),
                "recognition_type": recognition_type,
                "preprocessing_applied": True,
                "preprocessing_metadata": preprocessing_metadata,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        elif recognition_type == "word_by_word":
            # Process each word separately
            if not preprocess:
                results = await preprocessor.preprocess_handwriting(image, "word_recognition")
            
            word_results = []
            for i, word_segment in enumerate(results["word_segments"]):
                word_recognition = await model.predict(word_segment.image)
                word_results.append({
                    "word_index": i,
                    "text": word_recognition.text,
                    "confidence": word_recognition.confidence,
                    "bbox": word_segment.bbox
                })
            
            return {
                "words": word_results,
                "total_words": len(word_results),
                "recognition_type": recognition_type,
                "preprocessing_applied": True,
                "preprocessing_metadata": preprocessing_metadata,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid recognition_type")
            
    except Exception as e:
        logger.error(f"Recognition failed: {e}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {e}")


@app.post("/preprocess")
async def preprocess_image(
    file: UploadFile = File(...),
    task_type: str = "line_recognition",
    return_segments: bool = False,
    preprocessor: HandwritingPreprocessor = Depends(get_preprocessor)
):
    """
    Preprocess handwriting image without recognition.
    
    Args:
        file: Image file containing handwriting
        task_type: Type of preprocessing (line_recognition, word_recognition, character_recognition)
        return_segments: Whether to return segmented images
    """
    if not validate_image_file(file):
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    try:
        # Load image
        image = await load_image_from_upload(file)
        
        # Preprocess
        results = await preprocessor.preprocess_handwriting(image, task_type)
        
        # Prepare response
        response = {
            "preprocessing_completed": True,
            "task_type": task_type,
            "metadata": results["metadata"],
            "segment_counts": {
                "lines": len(results["line_segments"]),
                "words": len(results["word_segments"]),
                "characters": len(results["character_segments"])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if return_segments:
            # Convert images to base64 for JSON response
            import base64
            
            def image_to_base64(img):
                _, buffer = cv2.imencode('.png', img)
                return base64.b64encode(buffer).decode('utf-8')
            
            response["segments"] = {
                "lines": [
                    {
                        "index": i,
                        "bbox": seg.bbox,
                        "image_base64": image_to_base64(seg.image),
                        "confidence": seg.confidence
                    }
                    for i, seg in enumerate(results["line_segments"])
                ],
                "words": [
                    {
                        "index": i,
                        "bbox": seg.bbox,
                        "image_base64": image_to_base64(seg.image),
                        "confidence": seg.confidence
                    }
                    for i, seg in enumerate(results["word_segments"])
                ]
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {e}")


@app.post("/training/add_sample")
async def add_training_sample(
    ground_truth: str,
    file: UploadFile = File(...),
    category: str = "general",
    metadata: Optional[str] = None,
    collector: TrainingDataCollector = Depends(get_training_collector)
):
    """
    Add a training sample to the dataset.
    
    Args:
        file: Image file containing handwriting
        ground_truth: Correct text transcription
        category: Category for the sample (general, signature, form, etc.)
        metadata: Additional metadata as JSON string
    """
    if not validate_image_file(file):
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    try:
        # Load image
        image = await load_image_from_upload(file)
        
        # Parse metadata
        import json
        sample_metadata = {}
        if metadata:
            try:
                sample_metadata = json.loads(metadata)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid metadata JSON")
        
        # Add sample to training data
        sample_id = await collector.add_training_sample(
            image=image,
            ground_truth=ground_truth,
            category=category,
            metadata=sample_metadata
        )
        
        return {
            "sample_added": True,
            "sample_id": sample_id,
            "category": category,
            "ground_truth_length": len(ground_truth),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to add training sample: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add training sample: {e}")


@app.get("/training/stats")
async def get_training_stats(
    collector: TrainingDataCollector = Depends(get_training_collector)
):
    """Get training dataset statistics."""
    try:
        stats = await collector.get_dataset_stats()
        return {
            "dataset_stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get training stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get training stats: {e}")


@app.post("/training/start")
async def start_training(
    background_tasks: BackgroundTasks,
    epochs: int = 5,
    batch_size: int = 8,
    learning_rate: float = 1e-5,
    model: TrOCRHandwritingModel = Depends(get_icr_model),
    collector: TrainingDataCollector = Depends(get_training_collector)
):
    """
    Start model training in the background.
    
    Args:
        epochs: Number of training epochs
        batch_size: Training batch size
        learning_rate: Learning rate for training
    """
    try:
        # Check if training data exists
        stats = await collector.get_dataset_stats()
        if stats["total_samples"] < 10:
            raise HTTPException(
                status_code=400, 
                detail="Insufficient training data. Need at least 10 samples."
            )
        
        # Start training in background
        training_config = {
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "data_dir": ICR_CONFIG["training_data_path"]
        }
        
        background_tasks.add_task(model.train, training_config)
        
        return {
            "training_started": True,
            "training_config": training_config,
            "dataset_stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to start training: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start training: {e}")


@app.get("/model/info")
async def get_model_info(
    model: TrOCRHandwritingModel = Depends(get_icr_model)
):
    """Get information about the current model."""
    try:
        info = model.get_model_info()  # Remove await since it's not async
        return {
            "model_info": info,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {e}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,  # Different port from OCR service
        reload=True
    )