FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libffi-dev \
    libssl-dev \
    zlib1g-dev \
    libjpeg-dev \
    libpng-dev \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Pre-download NLTK data to avoid runtime downloads and zipfile corruption errors
RUN python -m nltk.downloader -d /root/nltk_data stopwords punkt wordnet averaged_perceptron_tagger

# (spaCy model downloads are left to runtime to avoid brittle model URLs)

# NOTE: spaCy model downloads and NLTK data downloads are moved to runtime
# to avoid brittle model URLs during image build. The application will
# download models on first start if not present.

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/trained_models /app/training_data /app/logs /app/temp

# Set permissions
RUN chmod -R 755 /app

# Expose port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8004/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004", "--workers", "4"]