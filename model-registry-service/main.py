"""
Model Registry Service

Centralized service for managing ML models across OCR, ICR, and NLP services.
Handles model versions, deployments, A/B testing, and performance tracking.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import os
import json
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field
import httpx

# Database imports
from sqlalchemy import create_engine, Column, String, DateTime, Float, Integer, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Model management imports
try:
    import mlflow
    import mlflow.tracking
    from minio import Minio
    from minio.error import S3Error
except ImportError:
    print("Warning: Some optional dependencies not available")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SmartDockAI Model Registry",
    description="Centralized ML model management service for OCR, ICR, and NLP models",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://registry_user:registry_password@localhost:5432/model_registry")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configuration
REGISTRY_CONFIG = {
    "storage": {
        "type": os.getenv("STORAGE_TYPE", "minio"),
        "endpoint": os.getenv("MINIO_ENDPOINT", "localhost:9000"),
        "access_key": os.getenv("MINIO_ACCESS_KEY", "admin"),
        "secret_key": os.getenv("MINIO_SECRET_KEY", "adminpassword"),
        "bucket": os.getenv("MODEL_BUCKET", "model-registry"),
        "secure": os.getenv("MINIO_SECURE", "false").lower() == "true"
    },
    "mlflow": {
        "tracking_uri": os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db"),
        "experiment_name": os.getenv("MLFLOW_EXPERIMENT", "smartdockai-models")
    },
    "services": {
        "ocr_service": os.getenv("OCR_SERVICE_URL", "http://python-ocr:8000"),
        "icr_service": os.getenv("ICR_SERVICE_URL", "http://python-icr:8001"),
        "nlp_service": os.getenv("NLP_SERVICE_URL", "http://python-nlp:8002")
    }
}

# Database Models
class ModelRecord(Base):
    __tablename__ = "models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    version = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)  # ocr, icr, nlp
    task_type = Column(String(100), nullable=False)  # sentiment, ner, ocr_text, etc.
    framework = Column(String(50), nullable=False)  # pytorch, tensorflow, huggingface
    
    # Storage info
    storage_path = Column(String(500), nullable=False)
    model_size = Column(Integer)  # bytes
    checksum = Column(String(64))  # SHA256
    
    # Metadata
    description = Column(Text)
    tags = Column(JSON)
    parameters = Column(JSON)
    metrics = Column(JSON)
    
    # Deployment info
    status = Column(String(20), default="uploaded")  # uploaded, validated, deployed, deprecated
    deployment_config = Column(JSON)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(255))
    
    # Performance tracking
    accuracy = Column(Float)
    latency_ms = Column(Float)
    memory_mb = Column(Float)
    
class ModelDeployment(Base):
    __tablename__ = "deployments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), nullable=False)
    service_name = Column(String(100), nullable=False)  # ocr-service, icr-service, nlp-service
    environment = Column(String(50), nullable=False)  # development, staging, production
    
    # Deployment configuration
    deployment_type = Column(String(20), default="primary")  # primary, canary, shadow
    traffic_percentage = Column(Float, default=100.0)
    
    # Status
    status = Column(String(20), default="pending")  # pending, active, inactive, failed
    deployed_at = Column(DateTime)
    health_check_url = Column(String(500))
    
    # Rollback info
    previous_model_id = Column(UUID(as_uuid=True))
    rollback_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ModelMetrics(Base):
    __tablename__ = "model_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), nullable=False)
    deployment_id = Column(UUID(as_uuid=True))
    
    # Metrics
    timestamp = Column(DateTime, default=datetime.utcnow)
    request_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    avg_latency_ms = Column(Float)
    avg_confidence = Column(Float)
    
    # Custom metrics
    custom_metrics = Column(JSON)

# Pydantic models for API
class ModelUploadRequest(BaseModel):
    name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    model_type: str = Field(..., description="Model type (ocr, icr, nlp)")
    task_type: str = Field(..., description="Task type")
    framework: str = Field(..., description="Framework (pytorch, tensorflow, etc.)")
    description: Optional[str] = Field(None, description="Model description")
    tags: Optional[List[str]] = Field([], description="Model tags")
    parameters: Optional[Dict[str, Any]] = Field({}, description="Model parameters")

class ModelInfo(BaseModel):
    id: str
    name: str
    version: str
    model_type: str
    task_type: str
    framework: str
    status: str
    created_at: datetime
    updated_at: datetime
    metrics: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class DeploymentRequest(BaseModel):
    model_id: str = Field(..., description="Model ID to deploy")
    service_name: str = Field(..., description="Target service")
    environment: str = Field(..., description="Deployment environment")
    deployment_type: str = Field("primary", description="Deployment type")
    traffic_percentage: float = Field(100.0, description="Traffic percentage")
    config: Optional[Dict[str, Any]] = Field({}, description="Deployment configuration")

class PerformanceMetrics(BaseModel):
    model_id: str
    latency_ms: float
    accuracy: Optional[float] = None
    confidence: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    custom_metrics: Optional[Dict[str, Any]] = None

# Global variables for services
storage_client: Optional[Minio] = None

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_storage_client():
    """Get MinIO storage client."""
    global storage_client
    if storage_client is None:
        storage_client = Minio(
            REGISTRY_CONFIG["storage"]["endpoint"],
            access_key=REGISTRY_CONFIG["storage"]["access_key"],
            secret_key=REGISTRY_CONFIG["storage"]["secret_key"],
            secure=REGISTRY_CONFIG["storage"]["secure"]
        )
        
        # Ensure bucket exists
        bucket_name = REGISTRY_CONFIG["storage"]["bucket"]
        if not storage_client.bucket_exists(bucket_name):
            storage_client.make_bucket(bucket_name)
            logger.info(f"Created bucket: {bucket_name}")
    
    return storage_client

def calculate_file_checksum(file_path: str) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting Model Registry Service...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize storage
    await get_storage_client()
    
    # Initialize MLflow
    try:
        mlflow.set_tracking_uri(REGISTRY_CONFIG["mlflow"]["tracking_uri"])
        mlflow.set_experiment(REGISTRY_CONFIG["mlflow"]["experiment_name"])
        logger.info("MLflow initialized")
    except Exception as e:
        logger.warning(f"MLflow initialization failed: {e}")
    
    logger.info("Model Registry Service startup complete")

@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "SmartDockAI Model Registry",
        "version": "1.0.0",
        "status": "active",
        "capabilities": [
            "model_upload",
            "model_versioning",
            "deployment_management",
            "performance_tracking",
            "a_b_testing",
            "rollback_support"
        ],
        "supported_types": ["ocr", "icr", "nlp"],
        "storage_backend": REGISTRY_CONFIG["storage"]["type"]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database
        db = next(get_db())
        db.execute("SELECT 1")
        db_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False
    
    # Check storage
    try:
        storage = await get_storage_client()
        bucket_name = REGISTRY_CONFIG["storage"]["bucket"]
        storage_healthy = storage.bucket_exists(bucket_name)
    except Exception as e:
        logger.error(f"Storage health check failed: {e}")
        storage_healthy = False
    
    status = "healthy" if db_healthy and storage_healthy else "unhealthy"
    status_code = 200 if status == "healthy" else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "storage": "healthy" if storage_healthy else "unhealthy"
            }
        }
    )

@app.post("/models/upload")
async def upload_model(
    model_info: ModelUploadRequest,
    model_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a new model to the registry."""
    try:
        # Validate model file
        if not model_file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Generate unique model ID
        model_id = str(uuid.uuid4())
        
        # Save file temporarily to calculate checksum
        temp_path = f"/tmp/{model_id}_{model_file.filename}"
        with open(temp_path, "wb") as f:
            content = await model_file.read()
            f.write(content)
        
        # Calculate checksum and size
        checksum = calculate_file_checksum(temp_path)
        file_size = os.path.getsize(temp_path)
        
        # Upload to storage
        storage = await get_storage_client()
        bucket_name = REGISTRY_CONFIG["storage"]["bucket"]
        storage_path = f"models/{model_info.model_type}/{model_info.name}/{model_info.version}/{model_file.filename}"
        
        storage.fput_object(bucket_name, storage_path, temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        # Create database record
        model_record = ModelRecord(
            id=model_id,
            name=model_info.name,
            version=model_info.version,
            model_type=model_info.model_type,
            task_type=model_info.task_type,
            framework=model_info.framework,
            storage_path=storage_path,
            model_size=file_size,
            checksum=checksum,
            description=model_info.description,
            tags=model_info.tags,
            parameters=model_info.parameters,
            status="uploaded"
        )
        
        db.add(model_record)
        db.commit()
        db.refresh(model_record)
        
        # Log to MLflow
        try:
            with mlflow.start_run(run_name=f"{model_info.name}-{model_info.version}"):
                mlflow.log_param("model_type", model_info.model_type)
                mlflow.log_param("task_type", model_info.task_type)
                mlflow.log_param("framework", model_info.framework)
                mlflow.log_param("version", model_info.version)
                mlflow.log_param("size_bytes", file_size)
                mlflow.log_param("checksum", checksum)
        except Exception as e:
            logger.warning(f"MLflow logging failed: {e}")
        
        logger.info(f"Model uploaded: {model_info.name} v{model_info.version}")
        
        return {
            "success": True,
            "model_id": model_id,
            "message": "Model uploaded successfully",
            "storage_path": storage_path,
            "checksum": checksum,
            "size_bytes": file_size
        }
        
    except Exception as e:
        logger.error(f"Model upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model upload failed: {e}")

@app.get("/models", response_model=List[ModelInfo])
async def list_models(
    model_type: Optional[str] = None,
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List models with optional filtering."""
    query = db.query(ModelRecord)
    
    if model_type:
        query = query.filter(ModelRecord.model_type == model_type)
    if task_type:
        query = query.filter(ModelRecord.task_type == task_type)
    if status:
        query = query.filter(ModelRecord.status == status)
    
    models = query.offset(offset).limit(limit).all()
    
    return [
        ModelInfo(
            id=str(model.id),
            name=model.name,
            version=model.version,
            model_type=model.model_type,
            task_type=model.task_type,
            framework=model.framework,
            status=model.status,
            created_at=model.created_at,
            updated_at=model.updated_at,
            metrics=model.metrics,
            tags=model.tags
        )
        for model in models
    ]

@app.get("/models/{model_id}")
async def get_model(model_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a specific model."""
    model = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Get deployment info
    deployments = db.query(ModelDeployment).filter(ModelDeployment.model_id == model_id).all()
    
    # Get recent metrics
    recent_metrics = db.query(ModelMetrics).filter(
        ModelMetrics.model_id == model_id
    ).order_by(ModelMetrics.timestamp.desc()).limit(10).all()
    
    return {
        "model": {
            "id": str(model.id),
            "name": model.name,
            "version": model.version,
            "model_type": model.model_type,
            "task_type": model.task_type,
            "framework": model.framework,
            "status": model.status,
            "description": model.description,
            "tags": model.tags,
            "parameters": model.parameters,
            "metrics": model.metrics,
            "storage_path": model.storage_path,
            "model_size": model.model_size,
            "checksum": model.checksum,
            "created_at": model.created_at,
            "updated_at": model.updated_at
        },
        "deployments": [
            {
                "id": str(dep.id),
                "service_name": dep.service_name,
                "environment": dep.environment,
                "deployment_type": dep.deployment_type,
                "traffic_percentage": dep.traffic_percentage,
                "status": dep.status,
                "deployed_at": dep.deployed_at
            }
            for dep in deployments
        ],
        "recent_metrics": [
            {
                "timestamp": metric.timestamp,
                "request_count": metric.request_count,
                "success_count": metric.success_count,
                "error_count": metric.error_count,
                "avg_latency_ms": metric.avg_latency_ms,
                "avg_confidence": metric.avg_confidence
            }
            for metric in recent_metrics
        ]
    }

@app.post("/models/{model_id}/deploy")
async def deploy_model(
    model_id: str,
    deployment: DeploymentRequest,
    db: Session = Depends(get_db)
):
    """Deploy a model to a service."""
    # Verify model exists
    model = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if there's already an active deployment for this service/environment
    existing_deployment = db.query(ModelDeployment).filter(
        ModelDeployment.service_name == deployment.service_name,
        ModelDeployment.environment == deployment.environment,
        ModelDeployment.status == "active"
    ).first()
    
    # Create new deployment record
    new_deployment = ModelDeployment(
        model_id=model_id,
        service_name=deployment.service_name,
        environment=deployment.environment,
        deployment_type=deployment.deployment_type,
        traffic_percentage=deployment.traffic_percentage,
        status="pending",
        previous_model_id=existing_deployment.model_id if existing_deployment else None
    )
    
    db.add(new_deployment)
    db.commit()
    db.refresh(new_deployment)
    
    # TODO: Implement actual deployment to target service
    # This would involve calling the target service's model update endpoint
    
    # For now, mark as active
    new_deployment.status = "active"
    new_deployment.deployed_at = datetime.utcnow()
    
    # Deactivate previous deployment if primary
    if deployment.deployment_type == "primary" and existing_deployment:
        existing_deployment.status = "inactive"
    
    db.commit()
    
    logger.info(f"Model {model_id} deployed to {deployment.service_name}")
    
    return {
        "success": True,
        "deployment_id": str(new_deployment.id),
        "message": f"Model deployed to {deployment.service_name}",
        "status": "active"
    }

@app.post("/metrics")
async def record_metrics(
    metrics: PerformanceMetrics,
    db: Session = Depends(get_db)
):
    """Record performance metrics for a model."""
    # Verify model exists
    model = db.query(ModelRecord).filter(ModelRecord.id == metrics.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Create metrics record
    metric_record = ModelMetrics(
        model_id=metrics.model_id,
        avg_latency_ms=metrics.latency_ms,
        avg_confidence=metrics.confidence,
        custom_metrics=metrics.custom_metrics
    )
    
    db.add(metric_record)
    
    # Update model's latest metrics
    if metrics.accuracy is not None:
        model.accuracy = metrics.accuracy
    if metrics.latency_ms is not None:
        model.latency_ms = metrics.latency_ms
    if metrics.memory_usage_mb is not None:
        model.memory_mb = metrics.memory_usage_mb
    
    db.commit()
    
    return {"success": True, "message": "Metrics recorded successfully"}

@app.get("/services/{service_name}/models")
async def get_deployed_models(
    service_name: str,
    environment: str = "production",
    db: Session = Depends(get_db)
):
    """Get currently deployed models for a service."""
    deployments = db.query(ModelDeployment).filter(
        ModelDeployment.service_name == service_name,
        ModelDeployment.environment == environment,
        ModelDeployment.status == "active"
    ).all()
    
    result = []
    for deployment in deployments:
        model = db.query(ModelRecord).filter(ModelRecord.id == deployment.model_id).first()
        if model:
            result.append({
                "deployment_id": str(deployment.id),
                "model_id": str(model.id),
                "model_name": model.name,
                "version": model.version,
                "deployment_type": deployment.deployment_type,
                "traffic_percentage": deployment.traffic_percentage,
                "deployed_at": deployment.deployed_at
            })
    
    return result

@app.delete("/models/{model_id}")
async def delete_model(model_id: str, db: Session = Depends(get_db)):
    """Delete a model from the registry."""
    model = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if model is currently deployed
    active_deployments = db.query(ModelDeployment).filter(
        ModelDeployment.model_id == model_id,
        ModelDeployment.status == "active"
    ).count()
    
    if active_deployments > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete model with active deployments"
        )
    
    # Delete from storage
    try:
        storage = await get_storage_client()
        bucket_name = REGISTRY_CONFIG["storage"]["bucket"]
        storage.remove_object(bucket_name, model.storage_path)
    except Exception as e:
        logger.warning(f"Failed to delete model file from storage: {e}")
    
    # Delete from database
    db.delete(model)
    db.commit()
    
    logger.info(f"Model deleted: {model_id}")
    
    return {"success": True, "message": "Model deleted successfully"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,  # Different port from other services
        reload=True
    )