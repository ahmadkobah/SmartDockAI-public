"""
NLP (Natural Language Processing) Service

FastAPI-based microservice for comprehensive text analysis including
sentiment analysis, entity recognition, keyword extraction, summarization, etc.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import os
from pathlib import Path
from pydantic import BaseModel, Field

# Local imports
try:
    from app.models.multitask_nlp_model import MultiTaskNLPModel
    from app.processing.text_processor import TextPreprocessor, PreprocessingConfig
    from app.models.base_nlp_model import NLPTaskType, LanguageCode
    from app.utils.config import get_config, setup_environment_config
except ImportError as e:
    print(f"Warning: Some imports failed: {e}")
    # Create minimal stubs for development
    class MultiTaskNLPModel:
        def __init__(self, config=None): pass
        def load_model(self): return True
        async def predict(self, *args, **kwargs): return {}
    
    class TextPreprocessor:
        def __init__(self, config=None): pass
    
    class NLPTaskType:
        SENTIMENT_ANALYSIS = "sentiment_analysis"
        ENTITY_RECOGNITION = "entity_recognition"
        KEYWORD_EXTRACTION = "keyword_extraction"
        TEXT_SUMMARIZATION = "text_summarization"
        LANGUAGE_DETECTION = "language_detection"
        TEXT_CLASSIFICATION = "text_classification"
        SEMANTIC_SIMILARITY = "semantic_similarity"
    
    class LanguageCode:
        ENGLISH = "en"
        AUTO_DETECT = "auto"
    
    def get_config():
        class MockConfig:
            def get(self, key, default=None): return default
            def get_model_config(self): return {}
            def get_max_text_length(self): return 10000
            def get_supported_languages(self): return ["en", "es", "fr", "de", "it", "pt", "ru", "zh"]
        return MockConfig()
    
    def setup_environment_config(): pass

# Setup configuration
setup_environment_config()
config = get_config()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SmartDockAI NLP Service",
    description="Natural Language Processing service for text analysis, sentiment, entities, and more",
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
nlp_model: Optional[MultiTaskNLPModel] = None
text_processor: Optional[TextPreprocessor] = None

# Configuration
try:
    NLP_CONFIG = {
        "model_path": config.get("models.base_path", "./models"),
        "training_data_path": config.get("training.data_path", "./training_data"),
        "cache_enabled": config.is_cache_enabled(),
        "max_text_length": config.get_max_text_length(),
        "supported_languages": config.get_supported_languages(),
        "models": config.get_model_config()
    }
except:
    NLP_CONFIG = {
        "model_path": os.getenv("NLP_MODEL_PATH", "./models"),
        "training_data_path": os.getenv("TRAINING_DATA_PATH", "./training_data"),
        "cache_enabled": os.getenv("CACHE_ENABLED", "true").lower() == "true",
        "max_text_length": int(os.getenv("MAX_TEXT_LENGTH", "10000")),
        "supported_languages": ["en", "es", "fr", "de", "it", "pt", "ru", "zh"],
        "models": {
            "sentiment_model": "cardiffnlp/twitter-roberta-base-sentiment-latest",
            "ner_model": "dbmdz/bert-large-cased-finetuned-conll03-english",
            "summarization_model": "facebook/bart-large-cnn",
            "sentence_model": "all-MiniLM-L6-v2",
            "spacy_model": "en_core_web_sm"
        }
    }

# Pydantic models for API
class TextInput(BaseModel):
    text: str = Field(..., description="Input text to process", max_length=10000)
    language: Optional[str] = Field(None, description="Language code (auto-detect if not specified)")
    
class SentimentRequest(TextInput):
    include_details: bool = Field(True, description="Include detailed sentiment scores")

class EntityRequest(TextInput):
    entity_types: Optional[List[str]] = Field(None, description="Filter by specific entity types")

class KeywordRequest(TextInput):
    max_keywords: int = Field(10, description="Maximum number of keywords to extract", ge=1, le=50)
    min_score: float = Field(0.1, description="Minimum keyword score threshold", ge=0.0, le=1.0)

class SummarizationRequest(TextInput):
    max_length: int = Field(150, description="Maximum summary length", ge=50, le=500)
    min_length: int = Field(50, description="Minimum summary length", ge=10, le=200)

class ClassificationRequest(TextInput):
    categories: Optional[List[str]] = Field(None, description="Custom categories for classification")

class SimilarityRequest(BaseModel):
    text1: str = Field(..., description="First text for comparison", max_length=5000)
    text2: str = Field(..., description="Second text for comparison", max_length=5000)
    language: Optional[str] = Field(None, description="Language code")

class BatchRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to process", max_length=100)
    task: str = Field(..., description="NLP task to perform")
    language: Optional[str] = Field(None, description="Language code")
    parameters: Optional[Dict[str, Any]] = Field({}, description="Task-specific parameters")

class TrainingRequest(BaseModel):
    task_type: str = Field(..., description="Type of NLP task to train")
    training_data: List[Dict[str, Any]] = Field(..., description="Training data samples")
    epochs: int = Field(10, description="Number of training epochs", ge=1, le=100)
    batch_size: int = Field(16, description="Training batch size", ge=1, le=128)
    learning_rate: float = Field(1e-5, description="Learning rate", ge=1e-6, le=1e-2)

# Dependency functions
async def get_nlp_model() -> MultiTaskNLPModel:
    """Dependency to get NLP model instance."""
    global nlp_model
    if nlp_model is None:
        nlp_model = MultiTaskNLPModel(NLP_CONFIG["models"])
        if not nlp_model.load_model():
            raise HTTPException(status_code=503, detail="Failed to load NLP model")
        logger.info("NLP model initialized")
    return nlp_model

async def get_text_processor() -> TextPreprocessor:
    """Dependency to get text processor instance."""
    global text_processor
    if text_processor is None:
        text_processor = TextPreprocessor()
        logger.info("Text processor initialized")
    return text_processor

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting NLP Service...")
    
    # Create necessary directories
    os.makedirs(NLP_CONFIG["model_path"], exist_ok=True)
    os.makedirs(NLP_CONFIG["training_data_path"], exist_ok=True)
    
    # Initialize models
    try:
        await get_nlp_model()
        await get_text_processor()
        logger.info("NLP Service startup complete")
    except Exception as e:
        logger.error(f"Failed to initialize NLP service: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down NLP Service...")

# Utility functions
def validate_language(language: Optional[str]) -> str:
    """Validate and normalize language code."""
    if not language or language == "auto":
        return "auto"
    
    if language in NLP_CONFIG["supported_languages"]:
        return language
    
    # Try to map common variations
    lang_map = {
        "english": "en",
        "spanish": "es", 
        "french": "fr",
        "german": "de",
        "italian": "it",
        "portuguese": "pt",
        "russian": "ru",
        "chinese": "zh"
    }
    
    return lang_map.get(language.lower(), "en")

def validate_text_length(text: str) -> str:
    """Validate text length."""
    if len(text) > NLP_CONFIG["max_text_length"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Text too long. Maximum length is {NLP_CONFIG['max_text_length']} characters."
        )
    
    if len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    return text.strip()

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "SmartDockAI NLP Service",
        "version": "1.0.0",
        "status": "active",
        "capabilities": [
            "sentiment_analysis",
            "entity_recognition", 
            "keyword_extraction",
            "text_summarization",
            "language_detection",
            "text_classification",
            "semantic_similarity",
            "batch_processing"
        ],
        "supported_languages": NLP_CONFIG["supported_languages"]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        model = await get_nlp_model()
        processor = await get_text_processor()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "nlp_model": "ready" if model else "unavailable",
                "text_processor": "ready" if processor else "unavailable"
            },
            "config": {
                "max_text_length": NLP_CONFIG["max_text_length"],
                "cache_enabled": NLP_CONFIG["cache_enabled"]
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

@app.post("/analyze/sentiment")
async def analyze_sentiment(
    request: SentimentRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Analyze sentiment of text."""
    try:
        text = validate_text_length(request.text)
        language = validate_language(request.language)
        
        result = await model.predict(
            text=text,
            task_type=NLPTaskType.SENTIMENT_ANALYSIS,
            language=language
        )
        
        response = {
            "sentiment": {
                "label": result.sentiment.label if result.sentiment else "neutral",
                "score": result.sentiment.score if result.sentiment else 0.5,
                "confidence": result.confidence
            },
            "text": text,
            "language": result.language,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if request.include_details and result.sentiment:
            response["sentiment"]["details"] = result.sentiment.details
            response["sentiment"]["compound_score"] = result.sentiment.compound_score
        
        return response
        
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {e}")

@app.post("/analyze/entities")
async def extract_entities(
    request: EntityRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Extract named entities from text."""
    try:
        text = validate_text_length(request.text)
        language = validate_language(request.language)
        
        result = await model.predict(
            text=text,
            task_type=NLPTaskType.ENTITY_RECOGNITION,
            language=language
        )
        
        entities = result.entities or []
        
        # Filter by entity types if specified
        if request.entity_types:
            entities = [
                entity for entity in entities 
                if entity.label.lower() in [t.lower() for t in request.entity_types]
            ]
        
        return {
            "entities": [
                {
                    "text": entity.text,
                    "label": entity.label,
                    "start": entity.start,
                    "end": entity.end,
                    "confidence": entity.confidence
                }
                for entity in entities
            ],
            "total_entities": len(entities),
            "text": text,
            "language": result.language,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {e}")

@app.post("/analyze/keywords")
async def extract_keywords(
    request: KeywordRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Extract keywords from text."""
    try:
        text = validate_text_length(request.text)
        language = validate_language(request.language)
        
        result = await model.predict(
            text=text,
            task_type=NLPTaskType.KEYWORD_EXTRACTION,
            language=language,
            max_keywords=request.max_keywords,
            min_score=request.min_score
        )
        
        keywords = result.keywords or []
        
        return {
            "keywords": [
                {
                    "keyword": kw.keyword,
                    "score": kw.score,
                    "frequency": kw.frequency
                }
                for kw in keywords
            ],
            "total_keywords": len(keywords),
            "text": text,
            "language": result.language,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Keyword extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Keyword extraction failed: {e}")

@app.post("/analyze/summarize")
async def summarize_text(
    request: SummarizationRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Summarize text."""
    try:
        text = validate_text_length(request.text)
        language = validate_language(request.language)
        
        result = await model.predict(
            text=text,
            task_type=NLPTaskType.TEXT_SUMMARIZATION,
            language=language,
            max_length=request.max_length,
            min_length=request.min_length
        )
        
        summary = result.summary
        
        return {
            "summary": {
                "text": summary.summary if summary else text[:request.max_length],
                "original_length": summary.original_length if summary else len(text),
                "summary_length": summary.summary_length if summary else len(text[:request.max_length]),
                "compression_ratio": summary.compression_ratio if summary else 1.0
            },
            "original_text": text,
            "language": result.language,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Text summarization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Text summarization failed: {e}")

@app.post("/analyze/language")
async def detect_language(
    request: TextInput,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Detect language of text."""
    try:
        text = validate_text_length(request.text)
        
        result = await model.predict(
            text=text,
            task_type=NLPTaskType.LANGUAGE_DETECTION
        )
        
        lang_result = result.language_detection
        
        return {
            "language": {
                "detected": lang_result.language if lang_result else "English",
                "confidence": lang_result.confidence if lang_result else 0.5,
                "iso_code": lang_result.iso_code if lang_result else "en",
                "alternatives": lang_result.alternatives if lang_result else []
            },
            "text": text,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Language detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Language detection failed: {e}")

@app.post("/analyze/classify")
async def classify_text(
    request: ClassificationRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Classify text into categories."""
    try:
        text = validate_text_length(request.text)
        language = validate_language(request.language)
        
        result = await model.predict(
            text=text,
            task_type=NLPTaskType.TEXT_CLASSIFICATION,
            language=language,
            categories=request.categories
        )
        
        classification = result.classification
        
        return {
            "classification": {
                "label": classification.label if classification else "unknown",
                "confidence": classification.confidence if classification else 0.0,
                "probabilities": classification.probabilities if classification else {}
            },
            "text": text,
            "language": result.language,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Text classification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Text classification failed: {e}")

@app.post("/analyze/similarity")
async def calculate_similarity(
    request: SimilarityRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Calculate semantic similarity between two texts."""
    try:
        text1 = validate_text_length(request.text1)
        text2 = validate_text_length(request.text2)
        language = validate_language(request.language)
        
        result = await model.predict(
            text=text1,
            task_type=NLPTaskType.SEMANTIC_SIMILARITY,
            language=language,
            compare_text=text2
        )
        
        similarity = result.similarity
        
        return {
            "similarity": {
                "score": similarity.similarity_score if similarity else 0.0,
                "method": similarity.method if similarity else "unknown"
            },
            "text1": text1,
            "text2": text2,
            "language": result.language,
            "processing_time": result.processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Similarity calculation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity calculation failed: {e}")

@app.post("/analyze/batch")
async def batch_analyze(
    request: BatchRequest,
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Process multiple texts with the same task."""
    try:
        if len(request.texts) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 texts per batch")
        
        # Validate all texts
        validated_texts = [validate_text_length(text) for text in request.texts]
        language = validate_language(request.language)
        
        # Map task string to enum
        task_map = {
            "sentiment": NLPTaskType.SENTIMENT_ANALYSIS,
            "entities": NLPTaskType.ENTITY_RECOGNITION,
            "keywords": NLPTaskType.KEYWORD_EXTRACTION,
            "summarize": NLPTaskType.TEXT_SUMMARIZATION,
            "language": NLPTaskType.LANGUAGE_DETECTION,
            "classify": NLPTaskType.TEXT_CLASSIFICATION,
            "similarity": NLPTaskType.SEMANTIC_SIMILARITY
        }
        
        task_type = task_map.get(request.task)
        if not task_type:
            raise HTTPException(status_code=400, detail=f"Unsupported task: {request.task}")
        
        # Process all texts
        results = await model.predict(
            text=validated_texts,
            task_type=task_type,
            language=language,
            **request.parameters
        )
        
        return {
            "results": [
                {
                    "text": text,
                    "result": result.__dict__,
                    "index": i
                }
                for i, (text, result) in enumerate(zip(validated_texts, results))
            ],
            "total_processed": len(results),
            "task": request.task,
            "language": language,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {e}")

@app.get("/models/info")
async def get_model_info(
    model: MultiTaskNLPModel = Depends(get_nlp_model)
):
    """Get information about loaded models."""
    try:
        info = model.get_model_info()
        return {
            "model_info": info,
            "config": NLP_CONFIG["models"],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,  # Different port from OCR (8000) and ICR (8001)
        reload=True
    )