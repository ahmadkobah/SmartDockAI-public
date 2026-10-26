# Multi-stage Docker build for NLP Service
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    python3-dev \
    gfortran \
    libopenblas-dev \
    liblapack-dev \
    libomp-dev \
    pkg-config \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel && \
    # Install numpy first so packages that compile against numpy headers (hdbscan, etc.)
    pip install numpy==1.24.3 && \
    pip install -r requirements.txt

## spaCy models and NLTK data will be downloaded at runtime if not present.

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/models /app/training_data /app/logs

# Change ownership to app user
RUN chown -R app:app /app

# Switch to app user
USER app

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]