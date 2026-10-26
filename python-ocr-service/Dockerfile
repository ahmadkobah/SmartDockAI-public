FROM python:3.11-slim

# Install system dependencies including additional language support
RUN apt-get update && apt-get install -y --no-install-recommends \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-deu \
  tesseract-ocr-fra \
  tesseract-ocr-spa \
  tesseract-ocr-ita \
  tesseract-ocr-por \
  tesseract-ocr-rus \
  tesseract-ocr-ara \
  tesseract-ocr-chi-sim \
  tesseract-ocr-chi-tra \
  tesseract-ocr-jpn \
  tesseract-ocr-kor \
  tesseract-ocr-hin \
  tesseract-ocr-tha \
  tesseract-ocr-vie \
  libgl1-mesa-dri \
  libgl1 \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libgomp1 \
  wget \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
  pip install numpy==1.24.3 && \
  pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for enhanced features
RUN mkdir -p training_data/images training_data/exports analytics cache models

# Set environment variables for enhanced features
ENV PYTHONPATH=/app
ENV LOG_LEVEL=INFO
ENV OCR_CACHE_ENABLED=true
ENV OCR_ANALYTICS_ENABLED=true
ENV OCR_MAX_WORKERS=4

# Expose port
EXPOSE 8000

# Health check with enhanced validation
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]