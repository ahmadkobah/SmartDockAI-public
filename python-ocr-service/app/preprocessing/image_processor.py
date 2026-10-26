"""
Advanced Image Preprocessing Service

Provides configurable image preprocessing pipelines for OCR optimization
and training data preparation.
"""

import cv2
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
from pathlib import Path
import json


class PreprocessingStep(Enum):
    """Available preprocessing steps."""
    RESIZE = "resize"
    GRAYSCALE = "grayscale"
    DENOISE = "denoise"
    BLUR = "blur"
    SHARPEN = "sharpen"
    CONTRAST_ENHANCE = "contrast_enhance"
    BRIGHTNESS_ADJUST = "brightness_adjust"
    DESKEW = "deskew"
    BINARIZE = "binarize"
    MORPHOLOGY = "morphology"
    EDGE_ENHANCE = "edge_enhance"


@dataclass
class PreprocessingConfig:
    """Configuration for preprocessing pipeline."""
    steps: List[Dict[str, Any]]
    export_intermediate: bool = False
    output_format: str = "png"
    quality: int = 95


@dataclass
class PreprocessingResult:
    """Result of image preprocessing."""
    processed_image: np.ndarray
    original_shape: Tuple[int, ...]
    final_shape: Tuple[int, ...]
    steps_applied: List[str]
    processing_time: float
    intermediate_images: Dict[str, np.ndarray] = None
    metadata: Dict[str, Any] = None


class ImagePreprocessingService:
    """Advanced image preprocessing service for OCR optimization."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Default preprocessing profiles
        self.profiles = {
            "document": [
                {"step": "grayscale"},
                {"step": "denoise", "params": {"kernel_size": 3}},
                {"step": "contrast_enhance"},
                {"step": "sharpen", "params": {"strength": 0.5}},
                {"step": "deskew"},
                {"step": "binarize", "params": {"method": "adaptive"}}
            ],
            "invoice": [
                {"step": "grayscale"},
                {"step": "resize", "params": {"max_width": 2000, "maintain_aspect": True}},
                {"step": "denoise", "params": {"kernel_size": 3}},
                {"step": "contrast_enhance"},
                {"step": "deskew"},
                {"step": "binarize", "params": {"method": "otsu"}}
            ],
            "handwriting": [
                {"step": "grayscale"},
                {"step": "denoise", "params": {"kernel_size": 5}},
                {"step": "contrast_enhance"},
                {"step": "edge_enhance"},
                {"step": "binarize", "params": {"method": "adaptive", "block_size": 15}}
            ],
            "low_quality": [
                {"step": "resize", "params": {"scale_factor": 2.0}},
                {"step": "grayscale"},
                {"step": "denoise", "params": {"kernel_size": 5}},
                {"step": "contrast_enhance"},
                {"step": "sharpen", "params": {"strength": 1.0}},
                {"step": "deskew"},
                {"step": "binarize", "params": {"method": "adaptive"}}
            ]
        }
    
    async def process_image(
        self, 
        image: np.ndarray,
        config: PreprocessingConfig = None,
        profile: str = "document"
    ) -> PreprocessingResult:
        """
        Process an image through the preprocessing pipeline.
        
        Args:
            image: Input image as numpy array
            config: Custom preprocessing configuration
            profile: Predefined profile name
            
        Returns:
            PreprocessingResult with processed image and metadata
        """
        import time
        start_time = time.time()
        
        # Use profile if no custom config provided
        if config is None:
            if profile not in self.profiles:
                raise ValueError(f"Unknown profile: {profile}")
            steps = self.profiles[profile]
            config = PreprocessingConfig(steps=steps)
        
        original_shape = image.shape
        processed_image = image.copy()
        steps_applied = []
        intermediate_images = {} if config.export_intermediate else None
        
        self.logger.info(f"Starting preprocessing with profile: {profile}")
        
        # Apply each preprocessing step
        for i, step_config in enumerate(config.steps):
            step_name = step_config["step"]
            params = step_config.get("params", {})
            
            try:
                processed_image = await self._apply_step(processed_image, step_name, params)
                steps_applied.append(step_name)
                
                # Store intermediate result if requested
                if config.export_intermediate:
                    intermediate_images[f"{i:02d}_{step_name}"] = processed_image.copy()
                
                self.logger.debug(f"Applied step: {step_name}")
                
            except Exception as e:
                self.logger.error(f"Failed to apply step {step_name}: {e}")
                raise
        
        processing_time = time.time() - start_time
        
        result = PreprocessingResult(
            processed_image=processed_image,
            original_shape=original_shape,
            final_shape=processed_image.shape,
            steps_applied=steps_applied,
            processing_time=processing_time,
            intermediate_images=intermediate_images,
            metadata={
                "profile": profile,
                "steps_count": len(steps_applied),
                "size_reduction": (np.prod(original_shape) - np.prod(processed_image.shape)) / np.prod(original_shape)
            }
        )
        
        self.logger.info(f"Preprocessing completed in {processing_time:.3f}s")
        return result
    
    async def _apply_step(self, image: np.ndarray, step: str, params: Dict[str, Any]) -> np.ndarray:
        """Apply a single preprocessing step."""
        
        if step == "resize":
            return self._resize_image(image, **params)
        elif step == "grayscale":
            return self._to_grayscale(image)
        elif step == "denoise":
            return self._denoise_image(image, **params)
        elif step == "blur":
            return self._blur_image(image, **params)
        elif step == "sharpen":
            return self._sharpen_image(image, **params)
        elif step == "contrast_enhance":
            return self._enhance_contrast(image, **params)
        elif step == "brightness_adjust":
            return self._adjust_brightness(image, **params)
        elif step == "deskew":
            return self._deskew_image(image, **params)
        elif step == "binarize":
            return self._binarize_image(image, **params)
        elif step == "morphology":
            return self._apply_morphology(image, **params)
        elif step == "edge_enhance":
            return self._enhance_edges(image, **params)
        else:
            raise ValueError(f"Unknown preprocessing step: {step}")
    
    def _resize_image(self, image: np.ndarray, **params) -> np.ndarray:
        """Resize image with various options."""
        scale_factor = params.get("scale_factor")
        max_width = params.get("max_width")
        max_height = params.get("max_height")
        target_width = params.get("target_width")
        target_height = params.get("target_height")
        maintain_aspect = params.get("maintain_aspect", True)
        
        height, width = image.shape[:2]
        
        if scale_factor:
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
        elif max_width and width > max_width:
            if maintain_aspect:
                scale = max_width / width
                new_width = max_width
                new_height = int(height * scale)
            else:
                new_width = max_width
                new_height = height
        elif max_height and height > max_height:
            if maintain_aspect:
                scale = max_height / height
                new_height = max_height
                new_width = int(width * scale)
            else:
                new_height = max_height
                new_width = width
        elif target_width and target_height:
            new_width = target_width
            new_height = target_height
        else:
            return image
        
        return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
    
    def _to_grayscale(self, image: np.ndarray) -> np.ndarray:
        """Convert image to grayscale."""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image
    
    def _denoise_image(self, image: np.ndarray, **params) -> np.ndarray:
        """Apply noise reduction."""
        kernel_size = params.get("kernel_size", 3)
        method = params.get("method", "bilateral")
        
        if method == "bilateral":
            return cv2.bilateralFilter(image, 9, 75, 75)
        elif method == "gaussian":
            return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
        elif method == "median":
            return cv2.medianBlur(image, kernel_size)
        elif method == "morphology":
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            return cv2.morphologyEx(image, cv2.MORPH_CLOSE, kernel)
        else:
            return cv2.fastNlMeansDenoising(image)
    
    def _blur_image(self, image: np.ndarray, **params) -> np.ndarray:
        """Apply blur effect."""
        kernel_size = params.get("kernel_size", 5)
        sigma = params.get("sigma", 1.0)
        return cv2.GaussianBlur(image, (kernel_size, kernel_size), sigma)
    
    def _sharpen_image(self, image: np.ndarray, **params) -> np.ndarray:
        """Apply sharpening filter."""
        strength = params.get("strength", 0.5)
        
        # Create sharpening kernel
        kernel = np.array([
            [-1, -1, -1],
            [-1, 9, -1],
            [-1, -1, -1]
        ], dtype=np.float32) * strength
        
        kernel[1, 1] = kernel[1, 1] - strength + 1
        
        return cv2.filter2D(image, -1, kernel)
    
    def _enhance_contrast(self, image: np.ndarray, **params) -> np.ndarray:
        """Enhance image contrast."""
        method = params.get("method", "clahe")
        
        if method == "clahe":
            clip_limit = params.get("clip_limit", 2.0)
            tile_grid_size = params.get("tile_grid_size", (8, 8))
            
            if len(image.shape) == 3:
                # Convert to LAB color space
                lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
                clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
                lab[:, :, 0] = clahe.apply(lab[:, :, 0])
                return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            else:
                clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
                return clahe.apply(image)
        elif method == "histogram_eq":
            if len(image.shape) == 3:
                # Convert to YUV and equalize Y channel
                yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
                yuv[:, :, 0] = cv2.equalizeHist(yuv[:, :, 0])
                return cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
            else:
                return cv2.equalizeHist(image)
        else:
            # Simple contrast stretching
            alpha = params.get("alpha", 1.5)
            beta = params.get("beta", 0)
            return cv2.convertScaleAbs(image, alpha=alpha, beta=beta)
    
    def _adjust_brightness(self, image: np.ndarray, **params) -> np.ndarray:
        """Adjust image brightness."""
        value = params.get("value", 0)
        return cv2.convertScaleAbs(image, alpha=1, beta=value)
    
    def _deskew_image(self, image: np.ndarray, **params) -> np.ndarray:
        """Correct image skew."""
        max_angle = params.get("max_angle", 45)
        
        # Convert to grayscale if needed
        gray = image if len(image.shape) == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Find edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Detect lines using Hough transform
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
        
        if lines is not None:
            # Calculate skew angle
            angles = []
            for rho, theta in lines[:, 0]:
                angle = np.degrees(theta) - 90
                if abs(angle) <= max_angle:
                    angles.append(angle)
            
            if angles:
                # Use median angle to avoid outliers
                skew_angle = np.median(angles)
                
                # Rotate image
                height, width = image.shape[:2]
                center = (width // 2, height // 2)
                rotation_matrix = cv2.getRotationMatrix2D(center, skew_angle, 1.0)
                
                return cv2.warpAffine(image, rotation_matrix, (width, height), 
                                    flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        
        return image
    
    def _binarize_image(self, image: np.ndarray, **params) -> np.ndarray:
        """Convert image to binary (black and white)."""
        method = params.get("method", "otsu")
        
        # Convert to grayscale if needed
        gray = image if len(image.shape) == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        if method == "otsu":
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        elif method == "adaptive":
            block_size = params.get("block_size", 11)
            c_constant = params.get("c_constant", 2)
            binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                         cv2.THRESH_BINARY, block_size, c_constant)
        elif method == "manual":
            threshold_value = params.get("threshold", 127)
            _, binary = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
        else:
            raise ValueError(f"Unknown binarization method: {method}")
        
        return binary
    
    def _apply_morphology(self, image: np.ndarray, **params) -> np.ndarray:
        """Apply morphological operations."""
        operation = params.get("operation", "opening")
        kernel_size = params.get("kernel_size", 3)
        kernel_shape = params.get("kernel_shape", "ellipse")
        iterations = params.get("iterations", 1)
        
        # Create kernel
        if kernel_shape == "ellipse":
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
        elif kernel_shape == "rect":
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
        else:
            kernel = cv2.getStructuringElement(cv2.MORPH_CROSS, (kernel_size, kernel_size))
        
        # Apply operation
        if operation == "opening":
            return cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel, iterations=iterations)
        elif operation == "closing":
            return cv2.morphologyEx(image, cv2.MORPH_CLOSE, kernel, iterations=iterations)
        elif operation == "erosion":
            return cv2.erode(image, kernel, iterations=iterations)
        elif operation == "dilation":
            return cv2.dilate(image, kernel, iterations=iterations)
        else:
            raise ValueError(f"Unknown morphological operation: {operation}")
    
    def _enhance_edges(self, image: np.ndarray, **params) -> np.ndarray:
        """Enhance edges in the image."""
        method = params.get("method", "unsharp_mask")
        
        if method == "unsharp_mask":
            sigma = params.get("sigma", 1.0)
            strength = params.get("strength", 0.5)
            
            blurred = cv2.GaussianBlur(image, (0, 0), sigma)
            unsharp = cv2.addWeighted(image, 1 + strength, blurred, -strength, 0)
            return unsharp
        elif method == "laplacian":
            laplacian = cv2.Laplacian(image, cv2.CV_64F)
            return np.uint8(np.absolute(laplacian))
        else:
            # Sobel edge detection
            sobelx = cv2.Sobel(image, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(image, cv2.CV_64F, 0, 1, ksize=3)
            sobel = np.sqrt(sobelx**2 + sobely**2)
            return np.uint8(sobel)
    
    def get_available_profiles(self) -> List[str]:
        """Get list of available preprocessing profiles."""
        return list(self.profiles.keys())
    
    def add_custom_profile(self, name: str, steps: List[Dict[str, Any]]) -> None:
        """Add a custom preprocessing profile."""
        self.profiles[name] = steps
        self.logger.info(f"Added custom preprocessing profile: {name}")
    
    async def export_training_pipeline(
        self, 
        images: List[np.ndarray],
        profile: str,
        output_dir: str
    ) -> Dict[str, Any]:
        """Export preprocessing pipeline for training data generation."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Process all images and save results
        results = []
        for i, image in enumerate(images):
            result = await self.process_image(image, profile=profile)
            
            # Save processed image
            output_file = output_path / f"processed_{i:06d}.png"
            cv2.imwrite(str(output_file), result.processed_image)
            
            # Save intermediate steps if available
            if result.intermediate_images:
                step_dir = output_path / f"steps_{i:06d}"
                step_dir.mkdir(exist_ok=True)
                
                for step_name, step_image in result.intermediate_images.items():
                    step_file = step_dir / f"{step_name}.png"
                    cv2.imwrite(str(step_file), step_image)
            
            results.append({
                "image_index": i,
                "output_file": str(output_file),
                "processing_time": result.processing_time,
                "steps_applied": result.steps_applied,
                "metadata": result.metadata
            })
        
        # Save pipeline configuration
        config_file = output_path / "preprocessing_config.json"
        with open(config_file, 'w') as f:
            json.dump({
                "profile": profile,
                "steps": self.profiles[profile],
                "results": results,
                "total_images": len(images)
            }, f, indent=2)
        
        self.logger.info(f"Exported preprocessing pipeline to {output_dir}")
        return {
            "output_directory": str(output_path),
            "config_file": str(config_file),
            "processed_images": len(images),
            "profile_used": profile
        }