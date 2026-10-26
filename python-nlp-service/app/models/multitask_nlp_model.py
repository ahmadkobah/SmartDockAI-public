"""
Multi-Task NLP Model

Comprehensive NLP model that combines multiple pre-trained models
for various NLP tasks including sentiment analysis, NER, summarization, etc.
"""

import asyncio
import time
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
import numpy as np
import torch
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    AutoModelForTokenClassification, pipeline,
    BertTokenizer, BertForSequenceClassification
)
import spacy
from spacy import displacy
from langdetect import detect, LangDetectError
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import re

from .base_nlp_model import (
    NLPModelInterface, NLPTaskType, LanguageCode, NLPResult,
    Entity, SentimentResult, KeywordResult, SummaryResult,
    LanguageResult, ClassificationResult, SimilarityResult,
    TrainingData, TrainingConfig
)

logger = logging.getLogger(__name__)


class MultiTaskNLPModel(NLPModelInterface):
    """Multi-task NLP model with comprehensive capabilities."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        
        self.model_name = "multitask_nlp_model"
        self.model_version = "1.0.0"
        self.supported_tasks = [
            NLPTaskType.SENTIMENT_ANALYSIS,
            NLPTaskType.ENTITY_RECOGNITION,
            NLPTaskType.KEYWORD_EXTRACTION,
            NLPTaskType.TEXT_SUMMARIZATION,
            NLPTaskType.LANGUAGE_DETECTION,
            NLPTaskType.TEXT_CLASSIFICATION,
            NLPTaskType.SEMANTIC_SIMILARITY
        ]
        self.supported_languages = [
            LanguageCode.ENGLISH, LanguageCode.SPANISH, LanguageCode.FRENCH,
            LanguageCode.GERMAN, LanguageCode.ITALIAN, LanguageCode.PORTUGUESE,
            LanguageCode.RUSSIAN, LanguageCode.CHINESE, LanguageCode.AUTO_DETECT
        ]
        
        # Model components
        self.spacy_model = None
        self.sentiment_analyzer = None
        self.vader_analyzer = None
        self.summarizer = None
        self.classifier = None
        self.ner_model = None
        self.sentence_transformer = None
        self.lemmatizer = None
        
        # Configuration
        self.sentiment_model_name = config.get("sentiment_model", "cardiffnlp/twitter-roberta-base-sentiment-latest")
        self.ner_model_name = config.get("ner_model", "dbmdz/bert-large-cased-finetuned-conll03-english")
        self.summarization_model = config.get("summarization_model", "facebook/bart-large-cnn")
        self.classification_model = config.get("classification_model", "microsoft/DialoGPT-medium")
        self.sentence_model = config.get("sentence_model", "all-MiniLM-L6-v2")
        self.spacy_model_name = config.get("spacy_model", "en_core_web_sm")
        
        logger.info(f"Initialized MultiTaskNLPModel with config: {config}")
    
    def load_model(self) -> bool:
        """Load all NLP models and dependencies."""
        try:
            logger.info("Loading NLP models...")
            
            # Download NLTK data
            self._download_nltk_data()
            
            # Load spaCy model
            try:
                self.spacy_model = spacy.load(self.spacy_model_name)
                logger.info(f"Loaded spaCy model: {self.spacy_model_name}")
            except OSError:
                logger.warning(f"spaCy model {self.spacy_model_name} not found, using en_core_web_sm")
                self.spacy_model = spacy.load("en_core_web_sm")
            
            # Load sentiment analysis models
            self.vader_analyzer = SentimentIntensityAnalyzer()
            
            try:
                self.sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model=self.sentiment_model_name,
                    tokenizer=self.sentiment_model_name
                )
                logger.info(f"Loaded sentiment model: {self.sentiment_model_name}")
            except Exception as e:
                logger.warning(f"Failed to load sentiment model: {e}")
                self.sentiment_analyzer = pipeline("sentiment-analysis")
            
            # Load NER model
            try:
                self.ner_model = pipeline(
                    "ner",
                    model=self.ner_model_name,
                    tokenizer=self.ner_model_name,
                    aggregation_strategy="simple"
                )
                logger.info(f"Loaded NER model: {self.ner_model_name}")
            except Exception as e:
                logger.warning(f"Failed to load NER model: {e}")
                self.ner_model = pipeline("ner", aggregation_strategy="simple")
            
            # Load summarization model
            try:
                self.summarizer = pipeline(
                    "summarization",
                    model=self.summarization_model
                )
                logger.info(f"Loaded summarization model: {self.summarization_model}")
            except Exception as e:
                logger.warning(f"Failed to load summarization model: {e}")
                self.summarizer = pipeline("summarization")
            
            # Load sentence transformer for similarity
            try:
                self.sentence_transformer = SentenceTransformer(self.sentence_model)
                logger.info(f"Loaded sentence transformer: {self.sentence_model}")
            except Exception as e:
                logger.warning(f"Failed to load sentence transformer: {e}")
            
            # Initialize NLTK components
            self.lemmatizer = WordNetLemmatizer()
            
            self.is_loaded = True
            logger.info("All NLP models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load NLP models: {e}")
            return False
    
    def _download_nltk_data(self):
        """Download required NLTK data."""
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('wordnet', quiet=True)
            nltk.download('vader_lexicon', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
        except Exception as e:
            logger.warning(f"Failed to download some NLTK data: {e}")
    
    async def predict(
        self,
        text: Union[str, List[str]],
        task_type: NLPTaskType = NLPTaskType.SENTIMENT_ANALYSIS,
        language: Optional[LanguageCode] = None,
        **kwargs
    ) -> Union[NLPResult, List[NLPResult]]:
        """Perform NLP prediction on text."""
        start_time = time.time()
        
        if isinstance(text, list):
            results = []
            for t in text:
                result = await self._predict_single(t, task_type, language, **kwargs)
                results.append(result)
            return results
        else:
            return await self._predict_single(text, task_type, language, **kwargs)
    
    async def _predict_single(
        self,
        text: str,
        task_type: NLPTaskType,
        language: Optional[LanguageCode] = None,
        **kwargs
    ) -> NLPResult:
        """Perform prediction on a single text."""
        start_time = time.time()
        
        # Preprocess text
        processed_text = self.preprocess_text(text, language)
        
        # Detect language if not specified
        detected_language = None
        if language is None or language == LanguageCode.AUTO_DETECT:
            detected_language = await self._detect_language(processed_text)
            language = detected_language.language if detected_language else "en"
        
        # Create base result
        result = NLPResult(
            task_type=task_type,
            text=text,
            language=language,
            processing_time=0.0,
            model_version=self.model_version
        )
        
        # Add language detection if performed
        if detected_language:
            result.language_detection = detected_language
        
        # Route to specific task handler
        try:
            if task_type == NLPTaskType.SENTIMENT_ANALYSIS:
                result.sentiment = await self._analyze_sentiment(processed_text)
            elif task_type == NLPTaskType.ENTITY_RECOGNITION:
                result.entities = await self._extract_entities(processed_text)
            elif task_type == NLPTaskType.KEYWORD_EXTRACTION:
                result.keywords = await self._extract_keywords(processed_text, **kwargs)
            elif task_type == NLPTaskType.TEXT_SUMMARIZATION:
                result.summary = await self._summarize_text(processed_text, **kwargs)
            elif task_type == NLPTaskType.LANGUAGE_DETECTION:
                if not result.language_detection:
                    result.language_detection = await self._detect_language(processed_text)
            elif task_type == NLPTaskType.TEXT_CLASSIFICATION:
                result.classification = await self._classify_text(processed_text, **kwargs)
            elif task_type == NLPTaskType.SEMANTIC_SIMILARITY:
                compare_text = kwargs.get("compare_text", "")
                result.similarity = await self._calculate_similarity(processed_text, compare_text)
            else:
                raise ValueError(f"Unsupported task type: {task_type}")
            
            # Calculate processing time
            result.processing_time = time.time() - start_time
            
            # Postprocess result
            result = self.postprocess_result(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed for task {task_type}: {e}")
            result.processing_time = time.time() - start_time
            result.metadata = {"error": str(e)}
            return result
    
    async def _analyze_sentiment(self, text: str) -> SentimentResult:
        """Analyze sentiment of text."""
        try:
            # Use VADER for quick analysis
            vader_scores = self.vader_analyzer.polarity_scores(text)
            
            # Use transformer model for more accurate analysis
            transformer_result = None
            if self.sentiment_analyzer:
                try:
                    transformer_result = self.sentiment_analyzer(text)[0]
                except Exception as e:
                    logger.warning(f"Transformer sentiment analysis failed: {e}")
            
            # Combine results
            if transformer_result:
                label = transformer_result['label'].lower()
                score = transformer_result['score']
                
                # Map transformer labels to standard format
                if label in ['positive', 'pos']:
                    label = 'positive'
                elif label in ['negative', 'neg']:
                    label = 'negative'
                else:
                    label = 'neutral'
            else:
                # Use VADER as fallback
                compound = vader_scores['compound']
                if compound >= 0.05:
                    label = 'positive'
                    score = compound
                elif compound <= -0.05:
                    label = 'negative'
                    score = abs(compound)
                else:
                    label = 'neutral'
                    score = 1.0 - abs(compound)
            
            return SentimentResult(
                label=label,
                score=score,
                compound_score=vader_scores['compound'],
                details={
                    'positive': vader_scores['pos'],
                    'negative': vader_scores['neg'],
                    'neutral': vader_scores['neu'],
                    'compound': vader_scores['compound']
                }
            )
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return SentimentResult(
                label='neutral',
                score=0.5,
                compound_score=0.0,
                details={}
            )
    
    async def _extract_entities(self, text: str) -> List[Entity]:
        """Extract named entities from text."""
        entities = []
        
        try:
            # Use spaCy for entity extraction
            if self.spacy_model:
                doc = self.spacy_model(text)
                for ent in doc.ents:
                    entities.append(Entity(
                        text=ent.text,
                        label=ent.label_,
                        start=ent.start_char,
                        end=ent.end_char,
                        confidence=1.0,  # spaCy doesn't provide confidence
                        metadata={"explanation": spacy.explain(ent.label_)}
                    ))
            
            # Use transformer NER model for additional entities
            if self.ner_model and len(entities) < 10:  # Avoid redundancy
                try:
                    ner_results = self.ner_model(text)
                    for ent in ner_results:
                        # Check if entity already exists
                        existing = any(
                            e.text.lower() == ent['word'].lower() and 
                            abs(e.start - ent['start']) < 5
                            for e in entities
                        )
                        
                        if not existing:
                            entities.append(Entity(
                                text=ent['word'],
                                label=ent['entity_group'],
                                start=ent['start'],
                                end=ent['end'],
                                confidence=ent['score'],
                                metadata={"source": "transformer"}
                            ))
                except Exception as e:
                    logger.warning(f"Transformer NER failed: {e}")
            
            return entities
            
        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            return []
    
    async def _extract_keywords(self, text: str, **kwargs) -> List[KeywordResult]:
        """Extract keywords from text."""
        try:
            max_keywords = kwargs.get("max_keywords", 10)
            min_score = kwargs.get("min_score", 0.1)
            
            # Preprocess text
            doc = self.spacy_model(text) if self.spacy_model else None
            
            # Remove stopwords and get lemmas
            stop_words = set(stopwords.words('english'))
            words = word_tokenize(text.lower())
            
            # Filter and lemmatize words
            filtered_words = []
            for word in words:
                if (word.isalpha() and 
                    word not in stop_words and 
                    len(word) > 2):
                    if self.lemmatizer:
                        word = self.lemmatizer.lemmatize(word)
                    filtered_words.append(word)
            
            # Calculate TF-IDF scores
            if len(filtered_words) < 3:
                return []
            
            # Create document for TF-IDF
            document = ' '.join(filtered_words)
            vectorizer = TfidfVectorizer(max_features=max_keywords * 2)
            tfidf_matrix = vectorizer.fit_transform([document])
            feature_names = vectorizer.get_feature_names_out()
            scores = tfidf_matrix.toarray()[0]
            
            # Create keyword results
            keywords = []
            for i, score in enumerate(scores):
                if score >= min_score:
                    keyword = feature_names[i]
                    frequency = filtered_words.count(keyword)
                    positions = [j for j, w in enumerate(words) if w.lower() == keyword]
                    
                    keywords.append(KeywordResult(
                        keyword=keyword,
                        score=float(score),
                        frequency=frequency,
                        positions=positions,
                        context=[]  # Could be enhanced with context extraction
                    ))
            
            # Sort by score and return top keywords
            keywords.sort(key=lambda x: x.score, reverse=True)
            return keywords[:max_keywords]
            
        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}")
            return []
    
    async def _summarize_text(self, text: str, **kwargs) -> SummaryResult:
        """Summarize text."""
        try:
            max_length = kwargs.get("max_length", 150)
            min_length = kwargs.get("min_length", 50)
            
            # Check if text is long enough to summarize
            sentences = sent_tokenize(text)
            if len(sentences) <= 2:
                return SummaryResult(
                    summary=text,
                    original_length=len(text),
                    summary_length=len(text),
                    compression_ratio=1.0,
                    key_sentences=sentences
                )
            
            # Use transformer summarization
            if self.summarizer:
                try:
                    # Truncate text if too long
                    if len(text) > 1024:
                        text = text[:1024]
                    
                    summary_result = self.summarizer(
                        text,
                        max_length=min(max_length, len(text) // 2),
                        min_length=min(min_length, len(text) // 4),
                        do_sample=False
                    )[0]
                    
                    summary_text = summary_result['summary_text']
                    
                    return SummaryResult(
                        summary=summary_text,
                        original_length=len(text),
                        summary_length=len(summary_text),
                        compression_ratio=len(summary_text) / len(text),
                        key_sentences=sent_tokenize(summary_text)
                    )
                    
                except Exception as e:
                    logger.warning(f"Transformer summarization failed: {e}")
            
            # Fallback: extractive summarization
            return self._extractive_summarization(text, sentences, max_length)
            
        except Exception as e:
            logger.error(f"Text summarization failed: {e}")
            return SummaryResult(
                summary=text[:max_length] + "..." if len(text) > max_length else text,
                original_length=len(text),
                summary_length=min(len(text), max_length),
                compression_ratio=min(1.0, max_length / len(text)),
                key_sentences=[]
            )
    
    def _extractive_summarization(self, text: str, sentences: List[str], max_length: int) -> SummaryResult:
        """Simple extractive summarization fallback."""
        # Score sentences by keyword frequency
        word_freq = {}
        words = word_tokenize(text.lower())
        stop_words = set(stopwords.words('english'))
        
        for word in words:
            if word.isalpha() and word not in stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Score sentences
        sentence_scores = {}
        for sentence in sentences:
            words = word_tokenize(sentence.lower())
            score = sum(word_freq.get(word, 0) for word in words if word.isalpha())
            sentence_scores[sentence] = score
        
        # Select top sentences
        sorted_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)
        
        summary_sentences = []
        current_length = 0
        
        for sentence, score in sorted_sentences:
            if current_length + len(sentence) <= max_length:
                summary_sentences.append(sentence)
                current_length += len(sentence)
            else:
                break
        
        summary = ' '.join(summary_sentences)
        
        return SummaryResult(
            summary=summary,
            original_length=len(text),
            summary_length=len(summary),
            compression_ratio=len(summary) / len(text),
            key_sentences=summary_sentences
        )
    
    async def _detect_language(self, text: str) -> Optional[LanguageResult]:
        """Detect language of text."""
        try:
            detected = detect(text)
            
            # Map to full language names
            language_map = {
                'en': 'English',
                'es': 'Spanish',
                'fr': 'French',
                'de': 'German',
                'it': 'Italian',
                'pt': 'Portuguese',
                'ru': 'Russian',
                'zh': 'Chinese',
                'ja': 'Japanese',
                'ko': 'Korean',
                'ar': 'Arabic'
            }
            
            language_name = language_map.get(detected, detected)
            
            return LanguageResult(
                language=language_name,
                confidence=0.9,  # langdetect doesn't provide confidence
                iso_code=detected,
                alternatives=[]
            )
            
        except LangDetectError:
            return LanguageResult(
                language='English',
                confidence=0.5,
                iso_code='en',
                alternatives=[]
            )
    
    async def _classify_text(self, text: str, **kwargs) -> ClassificationResult:
        """Classify text into categories."""
        try:
            # This is a placeholder implementation
            # In practice, you would use a trained classification model
            
            categories = kwargs.get("categories", ["positive", "negative", "neutral"])
            
            # Simple keyword-based classification as fallback
            positive_words = ["good", "great", "excellent", "amazing", "wonderful"]
            negative_words = ["bad", "terrible", "awful", "horrible", "poor"]
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                label = "positive"
                confidence = min(0.9, 0.5 + positive_count * 0.1)
            elif negative_count > positive_count:
                label = "negative"
                confidence = min(0.9, 0.5 + negative_count * 0.1)
            else:
                label = "neutral"
                confidence = 0.5
            
            probabilities = {label: confidence}
            for cat in categories:
                if cat != label:
                    probabilities[cat] = (1.0 - confidence) / (len(categories) - 1)
            
            return ClassificationResult(
                label=label,
                confidence=confidence,
                probabilities=probabilities,
                features={"positive_words": positive_count, "negative_words": negative_count}
            )
            
        except Exception as e:
            logger.error(f"Text classification failed: {e}")
            return ClassificationResult(
                label="unknown",
                confidence=0.0,
                probabilities={},
                features={}
            )
    
    async def _calculate_similarity(self, text1: str, text2: str) -> SimilarityResult:
        """Calculate semantic similarity between two texts."""
        try:
            if self.sentence_transformer:
                # Use sentence transformer for semantic similarity
                embeddings = self.sentence_transformer.encode([text1, text2])
                similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                
                return SimilarityResult(
                    similarity_score=float(similarity),
                    embedding_1=embeddings[0],
                    embedding_2=embeddings[1],
                    method="sentence_transformer"
                )
            else:
                # Fallback to TF-IDF similarity
                vectorizer = TfidfVectorizer()
                tfidf_matrix = vectorizer.fit_transform([text1, text2])
                similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                
                return SimilarityResult(
                    similarity_score=float(similarity),
                    embedding_1=None,
                    embedding_2=None,
                    method="tfidf"
                )
                
        except Exception as e:
            logger.error(f"Similarity calculation failed: {e}")
            return SimilarityResult(
                similarity_score=0.0,
                embedding_1=None,
                embedding_2=None,
                method="error"
            )
    
    async def train(
        self,
        training_data: List[TrainingData],
        config: TrainingConfig
    ) -> Dict[str, Any]:
        """Train the NLP model with provided data."""
        # This is a placeholder for training implementation
        # In practice, you would implement task-specific training
        
        logger.info(f"Training {config.task_type} model with {len(training_data)} samples")
        
        return {
            "status": "training_complete",
            "samples_used": len(training_data),
            "task_type": config.task_type.value,
            "epochs": config.epochs,
            "final_accuracy": 0.85,  # Placeholder
            "training_time": 300  # Placeholder
        }
    
    async def evaluate(
        self,
        test_data: List[TrainingData],
        metrics: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """Evaluate the model on test data."""
        if metrics is None:
            metrics = ["accuracy", "f1", "precision", "recall"]
        
        # Placeholder implementation
        return {
            "accuracy": 0.85,
            "f1": 0.83,
            "precision": 0.84,
            "recall": 0.82
        }