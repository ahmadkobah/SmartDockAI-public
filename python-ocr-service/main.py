"""
FastAPI OCR Service

Main API server for the Enhanced Python OCR microservice with training capabilities,
multi-language support, confidence scoring, batch processing, and analytics.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import cv2
import numpy as np
import io
from PIL import Image
import logging
import asyncio
import json
from datetime import datetime

from app.engines.enhanced_ocr_engine import EnhancedOCREngine
from app.preprocessing.image_processor import ImagePreprocessingService, PreprocessingConfig
from app.training.simple_collector import TrainingDataCollectionService
from app.analytics.dashboard import OCRAnalyticsDashboard

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SmartDockAI Enhanced OCR Service",
    description="Advanced OCR microservice with multi-language support, analytics, and training capabilities",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
ocr_engine: Optional[EnhancedOCREngine] = None
preprocessing_service: Optional[ImagePreprocessingService] = None
training_service: Optional[TrainingDataCollectionService] = None
analytics_dashboard: Optional[OCRAnalyticsDashboard] = None


# Enhanced Pydantic models
class OCRRequest(BaseModel):
    language: str = "eng"
    document_type: str = "general"
    preprocessing_profile: str = "document"
    preprocessing_options: Optional[Dict[str, Any]] = None
    collect_training_data: bool = False


class OCRResponse(BaseModel):
    text: str
    confidence: float
    processing_time: float
    language: str
    metadata: Dict[str, Any]
    words: List[Dict[str, Any]]
    lines: List[Dict[str, Any]]


class TrainingDataRequest(BaseModel):
    ground_truth: str
    language: str = "eng"
    document_type: str = "general"
    preprocessing_profile: str = "document"
    metadata: Optional[Dict[str, Any]] = None


class TrainingDataResponse(BaseModel):
    sample_id: str
    accuracy_score: float
    message: str


class HealthResponse(BaseModel):
    status: str
    services: Dict[str, Any]


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global ocr_engine, preprocessing_service, training_service, analytics_dashboard
    
    logger.info("Initializing Enhanced OCR services...")
    
    try:
        # Initialize Enhanced OCR engine
        ocr_engine = EnhancedOCREngine({
            "training_output_dir": "./training_data",
            "analytics_dir": "./analytics",
            "cache_dir": "./cache",
            "max_workers": 4,
            "enable_caching": True,
            "min_confidence": 30,
            "high_confidence_threshold": 80
        })
        await ocr_engine.initialize()
        
        # Initialize analytics dashboard
        analytics_dashboard = OCRAnalyticsDashboard("./analytics")
        
        # Initialize preprocessing service
        preprocessing_service = ImagePreprocessingService()
        
        # Initialize training service
        training_service = TrainingDataCollectionService({
            "data_directory": "./training_data"
        })
        
        logger.info("✅ All services initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise


def get_ocr_engine() -> EnhancedOCREngine:
    """Dependency to get OCR engine instance."""
    if ocr_engine is None:
        raise HTTPException(status_code=503, detail="OCR engine not initialized")
    return ocr_engine


def get_analytics_service() -> OCRAnalyticsDashboard:
    """Dependency to get analytics dashboard instance."""
    if analytics_dashboard is None:
        raise HTTPException(status_code=503, detail="Analytics dashboard not initialized")
    return analytics_dashboard


def get_preprocessing_service() -> ImagePreprocessingService:
    """Dependency to get preprocessing service."""
    if preprocessing_service is None:
        raise HTTPException(status_code=503, detail="Preprocessing service not initialized")
    return preprocessing_service


def get_training_service() -> TrainingDataCollectionService:
    """Dependency to get training service."""
    if training_service is None:
        raise HTTPException(status_code=503, detail="Training service not initialized")
    return training_service


async def load_image_from_upload(file: UploadFile) -> np.ndarray:
    """Load image from uploaded file."""
    try:
        # Read file content
        content = await file.read()
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(content))
        
        # Convert to numpy array
        if pil_image.mode == 'RGBA':
            pil_image = pil_image.convert('RGB')
        
        image_array = np.array(pil_image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        return image_array
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    services_status = {}
    
    if ocr_engine:
        services_status["ocr_engine"] = await ocr_engine.health_check()
    else:
        services_status["ocr_engine"] = {"status": "not_initialized"}
    
    services_status["preprocessing"] = {
        "status": "healthy" if preprocessing_service else "not_initialized"
    }
    
    services_status["training"] = {
        "status": "healthy" if training_service else "not_initialized"
    }
    
    overall_status = "healthy" if all(
        service.get("status") == "healthy" 
        for service in services_status.values()
    ) else "degraded"
    
    return HealthResponse(
        status=overall_status,
        services=services_status
    )


@app.post("/ocr/process", response_model=OCRResponse)
async def process_ocr(
    file: UploadFile = File(...),
    request: OCRRequest = Depends(),
    engine: EnhancedOCREngine = Depends(get_ocr_engine),
    preprocessor: ImagePreprocessingService = Depends(get_preprocessing_service),
    trainer: TrainingDataCollectionService = Depends(get_training_service)
):
    """Process image with OCR."""
    try:
        # Load image
        image = await load_image_from_upload(file)
        
        # Preprocess image
        preprocessing_result = await preprocessor.process_image(
            image, 
            profile=request.preprocessing_profile
        )
        
        # Perform OCR
        ocr_result = await engine.process_image(
            preprocessing_result.processed_image,
            language=request.language,
            options=request.preprocessing_options or {}
        )
        
        # Collect training data if requested
        if request.collect_training_data:
            # Note: This would typically include ground truth from user input
            # For now, we're just demonstrating the structure
            logger.info("Training data collection requested but ground truth not provided")
        
        # Format response
        return OCRResponse(
            text=ocr_result.text,
            confidence=ocr_result.confidence,
            processing_time=ocr_result.processing_time,
            language=ocr_result.language,
            metadata={
                **ocr_result.metadata,
                "preprocessing": {
                    "profile": request.preprocessing_profile,
                    "steps": preprocessing_result.steps_applied,
                    "processing_time": preprocessing_result.processing_time
                }
            },
            words=[
                {
                    "text": word.text,
                    "confidence": word.confidence,
                    "bbox": {
                        "x": word.bbox.x,
                        "y": word.bbox.y,
                        "width": word.bbox.width,
                        "height": word.bbox.height
                    }
                }
                for word in ocr_result.words
            ],
            lines=[
                {
                    "text": line.text,
                    "confidence": line.confidence,
                    "bbox": {
                        "x": line.bbox.x,
                        "y": line.bbox.y,
                        "width": line.bbox.width,
                        "height": line.bbox.height
                    }
                }
                for line in ocr_result.lines
            ]
        )
        
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/training/collect", response_model=TrainingDataResponse)
async def collect_training_data(
    file: UploadFile = File(...),
    request: TrainingDataRequest = Depends(),
    engine: EnhancedOCREngine = Depends(get_ocr_engine),
    preprocessor: ImagePreprocessingService = Depends(get_preprocessing_service),
    trainer: TrainingDataCollectionService = Depends(get_training_service)
):
    """Collect training data with ground truth."""
    try:
        # Load image
        image = await load_image_from_upload(file)
        
        # Preprocess image
        preprocessing_result = await preprocessor.process_image(
            image, 
            profile=request.preprocessing_profile
        )
        
        # Perform OCR
        ocr_result = await engine.process_image(
            preprocessing_result.processed_image,
            language=request.language
        )
        
        # Collect training sample
        sample_id = await trainer.collect_training_sample(
            image=preprocessing_result.processed_image,
            ground_truth=request.ground_truth,
            ocr_result=ocr_result.text,
            confidence=ocr_result.confidence,
            language=request.language,
            document_type=request.document_type,
            preprocessing_config={
                "profile": request.preprocessing_profile,
                "steps": preprocessing_result.steps_applied
            },
            metadata={
                **(request.metadata or {}),
                "original_filename": file.filename,
                "file_size": file.size
            }
        )
        
        # Calculate accuracy
        accuracy = engine._calculate_accuracy(request.ground_truth, ocr_result.text)
        
        return TrainingDataResponse(
            sample_id=sample_id,
            accuracy_score=accuracy,
            message=f"Training sample collected successfully with {accuracy:.1f}% accuracy"
        )
        
    except Exception as e:
        logger.error(f"Training data collection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Training data collection failed: {str(e)}")


@app.get("/training/statistics")
async def get_training_statistics(
    trainer: TrainingDataCollectionService = Depends(get_training_service)
):
    """Get training data statistics."""
    try:
        stats = await trainer.get_statistics()
        return stats
    except Exception as e:
        logger.error(f"Failed to get training statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@app.get("/engines/info")
async def get_engine_info(
    engine: EnhancedOCREngine = Depends(get_ocr_engine)
):
    """Get OCR engine information."""
    return engine.get_engine_info()


@app.get("/preprocessing/profiles")
async def get_preprocessing_profiles(
    preprocessor: ImagePreprocessingService = Depends(get_preprocessing_service)
):
    """Get available preprocessing profiles."""
    return {
        "profiles": preprocessor.get_available_profiles(),
        "description": "Available preprocessing profiles for different document types"
    }


# Enhanced OCR Endpoints

@app.get("/ocr/languages")
async def get_supported_languages(
    engine: EnhancedOCREngine = Depends(get_ocr_engine)
):
    """Get supported languages for OCR processing."""
    return {
        "supported_languages": engine.get_language_support(),
        "total_languages": len(engine.get_language_support()),
        "description": "Language code mapping for OCR processing"
    }


@app.get("/ocr/configs")
async def get_ocr_configurations(
    engine: EnhancedOCREngine = Depends(get_ocr_engine)
):
    """Get available OCR configurations."""
    return {
        "configurations": engine.get_available_configs(),
        "description": "Available OCR processing configurations for different content types"
    }


@app.post("/ocr/batch")
async def process_batch_ocr(
    files: List[UploadFile] = File(...),
    language: str = Query("eng", description="Language for OCR processing"),
    config_name: str = Query("auto", description="OCR configuration to use"),
    engine: EnhancedOCREngine = Depends(get_ocr_engine),
    analytics: OCRAnalyticsDashboard = Depends(get_analytics_service),
):
    """Process multiple images with OCR in batch mode."""
    try:
        if len(files) > 20:  # Limit batch size
            raise HTTPException(status_code=400, detail="Batch size limited to 20 files")
        
        # Load and validate images
        images = []
        for i, file in enumerate(files):
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail=f"File {i+1} is not an image")
            
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
            images.append(image_array)
        
        # Process batch
        results = await engine.process_batch(images, language, config_name)
        
        # Record analytics for each result
        for result in results:
            result_dict = result.__dict__
            analytics.record_ocr_operation(result_dict, result.processing_time)
        
        # Format response
        response_data = []
        for i, result in enumerate(results):
            response_data.append({
                "file_index": i,
                "filename": files[i].filename,
                "text": result.text,
                "confidence": result.confidence,
                "processing_time": result.processing_time,
                "language": result.language,
                "quality_metrics": getattr(result, 'quality_metrics', {}),
                "word_count": len(result.words),
                "line_count": len(result.lines),
                "error": getattr(result, 'error', None)
            })
        
        return {
            "success": True,
            "batch_size": len(files),
            "successful_results": len([r for r in results if not hasattr(r, 'error')]),
            "results": response_data,
            "total_processing_time": sum(r.processing_time for r in results),
            "average_confidence": sum(r.confidence for r in results) / len(results) if results else 0
        }
        
    except Exception as e:
        logger.error(f"Batch OCR processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")


@app.get("/analytics/dashboard")
async def get_dashboard_analytics(
    days: int = Query(30, description="Number of days for analytics"),
    analytics: OCRAnalyticsDashboard = Depends(get_analytics_service)
):
    """Get comprehensive analytics dashboard data."""
    try:
        dashboard_data = analytics.get_dashboard_data(days)
        return dashboard_data
    except Exception as e:
        logger.error(f"Analytics dashboard failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics failed: {str(e)}")


@app.get("/analytics/performance")
async def get_performance_analytics(
    days: int = Query(7, description="Number of days for performance report"),
    analytics: OCRAnalyticsDashboard = Depends(get_analytics_service)
):
    """Get detailed performance analytics."""
    try:
        performance_data = analytics.get_performance_report(days)
        return performance_data
    except Exception as e:
        logger.error(f"Performance analytics failed: {e}")
        raise HTTPException(status_code=500, detail=f"Performance analytics failed: {str(e)}")


@app.get("/analytics/languages")
async def get_language_analytics(
    analytics: OCRAnalyticsDashboard = Depends(get_analytics_service)
):
    """Get language usage analytics."""
    try:
        language_data = analytics.get_language_analytics()
        return language_data
    except Exception as e:
        logger.error(f"Language analytics failed: {e}")
        raise HTTPException(status_code=500, detail=f"Language analytics failed: {str(e)}")


@app.get("/analytics/export")
async def export_analytics(
    format: str = Query("json", description="Export format (json or csv)"),
    analytics: OCRAnalyticsDashboard = Depends(get_analytics_service)
):
    """Export analytics data."""
    try:
        if format not in ["json", "csv"]:
            raise HTTPException(status_code=400, detail="Format must be 'json' or 'csv'")
        
        export_data = analytics.export_analytics(format)
        
        if format == "json":
            return {"data": json.loads(export_data)}
        else:
            return {"data": export_data, "format": "csv"}
            
    except Exception as e:
        logger.error(f"Analytics export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@app.get("/analytics")
async def get_engine_analytics(
    engine: EnhancedOCREngine = Depends(get_ocr_engine)
):
    """Get engine-level analytics and statistics."""
    try:
        analytics_data = engine.get_analytics()
        return analytics_data
    except Exception as e:
        logger.error(f"Engine analytics failed: {e}")
        raise HTTPException(status_code=500, detail=f"Engine analytics failed: {str(e)}")


@app.post("/analytics/reset")
async def reset_analytics(
    engine: EnhancedOCREngine = Depends(get_ocr_engine)
):
    """Reset engine analytics data."""
    try:
        engine.reset_analytics()
        return {"message": "Analytics data reset successfully"}
    except Exception as e:
        logger.error(f"Analytics reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics reset failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)