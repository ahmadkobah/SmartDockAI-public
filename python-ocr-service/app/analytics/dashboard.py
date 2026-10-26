"""
OCR Analytics Dashboard

Provides comprehensive analytics and monitoring for OCR operations
including performance metrics, quality analysis, and usage statistics.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import statistics
from collections import defaultdict, Counter
import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class OCRAnalyticsDashboard:
    """Comprehensive analytics dashboard for OCR operations."""
    
    def __init__(self, analytics_dir: str = "./analytics"):
        self.analytics_dir = Path(analytics_dir)
        self.analytics_dir.mkdir(parents=True, exist_ok=True)
        
        # Historical data storage
        self.daily_stats = defaultdict(lambda: {
            'total_processed': 0,
            'total_time': 0,
            'confidence_scores': [],
            'language_usage': defaultdict(int),
            'quality_distribution': {'high': 0, 'medium': 0, 'low': 0},
            'error_count': 0
        })
        
        # Load historical data
        self._load_historical_data()
    
    def _load_historical_data(self):
        """Load historical analytics data."""
        history_file = self.analytics_dir / "daily_history.json"
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    data = json.load(f)
                    for date_str, stats in data.items():
                        self.daily_stats[date_str] = stats
                logger.info(f"Loaded {len(data)} days of historical data")
            except Exception as e:
                logger.warning(f"Failed to load historical data: {e}")
    
    def _save_historical_data(self):
        """Save historical analytics data."""
        history_file = self.analytics_dir / "daily_history.json"
        try:
            # Convert defaultdicts to regular dicts for JSON serialization
            data_to_save = {}
            for date_str, stats in self.daily_stats.items():
                data_to_save[date_str] = {
                    'total_processed': stats['total_processed'],
                    'total_time': stats['total_time'],
                    'confidence_scores': stats['confidence_scores'],
                    'language_usage': dict(stats['language_usage']),
                    'quality_distribution': stats['quality_distribution'],
                    'error_count': stats['error_count']
                }
            
            with open(history_file, 'w') as f:
                json.dump(data_to_save, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save historical data: {e}")
    
    def record_ocr_operation(self, result: Dict[str, Any], processing_time: float):
        """Record an OCR operation for analytics."""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            stats = self.daily_stats[today]
            
            # Update basic stats
            stats['total_processed'] += 1
            stats['total_time'] += processing_time
            
            # Record confidence
            confidence = result.get('confidence', 0)
            stats['confidence_scores'].append(confidence)
            
            # Record language usage
            language = result.get('language', 'unknown')
            stats['language_usage'][language] += 1
            
            # Record quality distribution
            quality = result.get('quality_metrics', {}).get('overall_quality', 'unknown')
            if quality == 'excellent' or quality == 'good':
                stats['quality_distribution']['high'] += 1
            elif quality == 'fair':
                stats['quality_distribution']['medium'] += 1
            elif quality == 'poor':
                stats['quality_distribution']['low'] += 1
            
            # Record errors
            if result.get('error'):
                stats['error_count'] += 1
            
            # Save data periodically
            if stats['total_processed'] % 10 == 0:
                self._save_historical_data()
                
        except Exception as e:
            logger.error(f"Failed to record OCR operation: {e}")
    
    def get_dashboard_data(self, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive dashboard data for the specified number of days."""
        try:
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Collect data for the date range
            daily_data = []
            total_processed = 0
            total_time = 0
            all_confidence_scores = []
            language_usage = defaultdict(int)
            quality_totals = {'high': 0, 'medium': 0, 'low': 0}
            total_errors = 0
            
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                stats = self.daily_stats.get(date_str, {})
                
                daily_processed = stats.get('total_processed', 0)
                daily_time = stats.get('total_time', 0)
                daily_confidence = stats.get('confidence_scores', [])
                daily_languages = stats.get('language_usage', {})
                daily_quality = stats.get('quality_distribution', {'high': 0, 'medium': 0, 'low': 0})
                daily_errors = stats.get('error_count', 0)
                
                # Add to daily data
                daily_data.append({
                    'date': date_str,
                    'processed': daily_processed,
                    'avg_processing_time': daily_time / max(daily_processed, 1),
                    'avg_confidence': statistics.mean(daily_confidence) if daily_confidence else 0,
                    'error_rate': daily_errors / max(daily_processed, 1) * 100,
                    'quality_distribution': daily_quality
                })
                
                # Add to totals
                total_processed += daily_processed
                total_time += daily_time
                all_confidence_scores.extend(daily_confidence)
                
                for lang, count in daily_languages.items():
                    language_usage[lang] += count
                
                for quality, count in daily_quality.items():
                    quality_totals[quality] += count
                
                total_errors += daily_errors
                
                current_date += timedelta(days=1)
            
            # Calculate summary statistics
            avg_processing_time = total_time / max(total_processed, 1)
            avg_confidence = statistics.mean(all_confidence_scores) if all_confidence_scores else 0
            error_rate = total_errors / max(total_processed, 1) * 100
            
            # Confidence statistics
            confidence_stats = {}
            if all_confidence_scores:
                confidence_stats = {
                    'mean': statistics.mean(all_confidence_scores),
                    'median': statistics.median(all_confidence_scores),
                    'min': min(all_confidence_scores),
                    'max': max(all_confidence_scores),
                    'std_dev': statistics.stdev(all_confidence_scores) if len(all_confidence_scores) > 1 else 0,
                    'percentiles': {
                        '25th': self._percentile(all_confidence_scores, 25),
                        '75th': self._percentile(all_confidence_scores, 75),
                        '90th': self._percentile(all_confidence_scores, 90),
                        '95th': self._percentile(all_confidence_scores, 95)
                    }
                }
            
            # Top languages
            top_languages = dict(Counter(language_usage).most_common(10))
            
            # Performance trends
            recent_days = daily_data[-7:] if len(daily_data) >= 7 else daily_data
            performance_trend = {
                'processing_time_trend': [d['avg_processing_time'] for d in recent_days],
                'confidence_trend': [d['avg_confidence'] for d in recent_days],
                'volume_trend': [d['processed'] for d in recent_days],
                'error_trend': [d['error_rate'] for d in recent_days]
            }
            
            # Quality insights
            quality_percentage = {}
            total_quality = sum(quality_totals.values())
            if total_quality > 0:
                quality_percentage = {
                    'high': quality_totals['high'] / total_quality * 100,
                    'medium': quality_totals['medium'] / total_quality * 100,
                    'low': quality_totals['low'] / total_quality * 100
                }
            
            return {
                'summary': {
                    'total_processed': total_processed,
                    'total_processing_time': total_time,
                    'average_processing_time': avg_processing_time,
                    'average_confidence': avg_confidence,
                    'error_rate': error_rate,
                    'date_range': {
                        'start': start_date.strftime('%Y-%m-%d'),
                        'end': end_date.strftime('%Y-%m-%d'),
                        'days': days
                    }
                },
                'confidence_statistics': confidence_stats,
                'quality_distribution': {
                    'counts': quality_totals,
                    'percentages': quality_percentage
                },
                'language_usage': top_languages,
                'performance_trends': performance_trend,
                'daily_data': daily_data,
                'insights': self._generate_insights(daily_data, performance_trend, quality_percentage),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Dashboard data generation failed: {e}")
            return {'error': str(e)}
    
    def _percentile(self, data: List[float], percentile: float) -> float:
        """Calculate percentile value."""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def _generate_insights(self, daily_data: List[Dict], trends: Dict, quality: Dict) -> List[Dict]:
        """Generate actionable insights from analytics data."""
        insights = []
        
        try:
            if len(daily_data) >= 7:
                # Volume trend analysis
                recent_volume = [d['processed'] for d in daily_data[-7:]]
                if len(recent_volume) > 1:
                    volume_trend = statistics.mean(recent_volume[-3:]) - statistics.mean(recent_volume[:3])
                    if volume_trend > 10:
                        insights.append({
                            'type': 'positive',
                            'title': 'Increasing Usage',
                            'message': f'OCR usage has increased by {volume_trend:.0f} operations/day in recent days.',
                            'recommendation': 'Consider scaling resources to handle increased load.'
                        })
                    elif volume_trend < -10:
                        insights.append({
                            'type': 'info',
                            'title': 'Decreasing Usage',
                            'message': f'OCR usage has decreased by {abs(volume_trend):.0f} operations/day recently.',
                            'recommendation': 'Monitor for potential issues or seasonal patterns.'
                        })
                
                # Performance trend analysis
                performance_data = [d['avg_processing_time'] for d in daily_data[-7:]]
                if len(performance_data) > 1:
                    perf_trend = statistics.mean(performance_data[-3:]) - statistics.mean(performance_data[:3])
                    if perf_trend > 0.5:
                        insights.append({
                            'type': 'warning',
                            'title': 'Performance Degradation',
                            'message': f'Average processing time has increased by {perf_trend:.2f}s recently.',
                            'recommendation': 'Check system resources and consider optimization.'
                        })
                
                # Error rate analysis
                error_rates = [d['error_rate'] for d in daily_data[-7:]]
                avg_error_rate = statistics.mean(error_rates)
                if avg_error_rate > 5:
                    insights.append({
                        'type': 'critical',
                        'title': 'High Error Rate',
                        'message': f'Average error rate is {avg_error_rate:.1f}%, above recommended threshold.',
                        'recommendation': 'Review image preprocessing and OCR configurations.'
                    })
                
                # Confidence analysis
                confidence_data = [d['avg_confidence'] for d in daily_data[-7:]]
                avg_confidence = statistics.mean(confidence_data)
                if avg_confidence < 70:
                    insights.append({
                        'type': 'warning',
                        'title': 'Low Confidence Scores',
                        'message': f'Average confidence score is {avg_confidence:.1f}%, below optimal range.',
                        'recommendation': 'Consider improving image quality or adjusting OCR parameters.'
                    })
            
            # Quality distribution analysis
            if quality:
                high_quality_percent = quality.get('high', 0)
                if high_quality_percent < 50:
                    insights.append({
                        'type': 'warning',
                        'title': 'Quality Concerns',
                        'message': f'Only {high_quality_percent:.1f}% of OCR results are high quality.',
                        'recommendation': 'Review image preprocessing and OCR settings.'
                    })
                elif high_quality_percent > 80:
                    insights.append({
                        'type': 'positive',
                        'title': 'Excellent Quality',
                        'message': f'{high_quality_percent:.1f}% of OCR results are high quality.',
                        'recommendation': 'Current configuration is performing well.'
                    })
            
            # Add general recommendations if no specific insights
            if not insights:
                insights.append({
                    'type': 'info',
                    'title': 'System Operating Normally',
                    'message': 'OCR system is performing within expected parameters.',
                    'recommendation': 'Continue monitoring and consider periodic optimization reviews.'
                })
            
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            insights.append({
                'type': 'error',
                'title': 'Analysis Error',
                'message': 'Unable to generate insights due to data processing error.',
                'recommendation': 'Check analytics data integrity.'
            })
        
        return insights
    
    def get_language_analytics(self) -> Dict[str, Any]:
        """Get detailed language usage analytics."""
        try:
            all_language_usage = defaultdict(int)
            daily_language_trends = defaultdict(list)
            
            # Aggregate language data
            for date_str, stats in self.daily_stats.items():
                languages = stats.get('language_usage', {})
                for lang, count in languages.items():
                    all_language_usage[lang] += count
                    daily_language_trends[lang].append({
                        'date': date_str,
                        'count': count
                    })
            
            # Calculate language statistics
            total_operations = sum(all_language_usage.values())
            language_stats = {}
            
            for lang, count in all_language_usage.items():
                percentage = (count / total_operations * 100) if total_operations > 0 else 0
                
                # Calculate trend for last 7 days
                recent_data = daily_language_trends[lang][-7:]
                trend = 'stable'
                if len(recent_data) >= 4:
                    early_avg = statistics.mean([d['count'] for d in recent_data[:3]])
                    late_avg = statistics.mean([d['count'] for d in recent_data[-3:]])
                    if late_avg > early_avg * 1.2:
                        trend = 'increasing'
                    elif late_avg < early_avg * 0.8:
                        trend = 'decreasing'
                
                language_stats[lang] = {
                    'total_count': count,
                    'percentage': percentage,
                    'trend': trend,
                    'daily_data': recent_data
                }
            
            return {
                'summary': {
                    'total_operations': total_operations,
                    'unique_languages': len(all_language_usage),
                    'most_used': max(all_language_usage.items(), key=lambda x: x[1]) if all_language_usage else None
                },
                'language_statistics': dict(sorted(language_stats.items(), key=lambda x: x[1]['total_count'], reverse=True)),
                'top_languages': dict(Counter(all_language_usage).most_common(10)),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Language analytics failed: {e}")
            return {'error': str(e)}
    
    def get_performance_report(self, days: int = 7) -> Dict[str, Any]:
        """Generate detailed performance report."""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Collect performance data
            processing_times = []
            confidence_scores = []
            throughput_data = []
            error_counts = []
            
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                stats = self.daily_stats.get(date_str, {})
                
                processed = stats.get('total_processed', 0)
                total_time = stats.get('total_time', 0)
                confidence_list = stats.get('confidence_scores', [])
                errors = stats.get('error_count', 0)
                
                if processed > 0:
                    avg_time = total_time / processed
                    processing_times.append(avg_time)
                    throughput_data.append(processed)
                    error_counts.append(errors)
                    
                confidence_scores.extend(confidence_list)
                
                current_date += timedelta(days=1)
            
            # Calculate performance metrics
            performance_metrics = {}
            if processing_times:
                performance_metrics = {
                    'average_processing_time': statistics.mean(processing_times),
                    'median_processing_time': statistics.median(processing_times),
                    'min_processing_time': min(processing_times),
                    'max_processing_time': max(processing_times),
                    'processing_time_std': statistics.stdev(processing_times) if len(processing_times) > 1 else 0
                }
            
            # Throughput analysis
            throughput_metrics = {}
            if throughput_data:
                throughput_metrics = {
                    'average_daily_throughput': statistics.mean(throughput_data),
                    'peak_daily_throughput': max(throughput_data),
                    'total_throughput': sum(throughput_data),
                    'throughput_consistency': 100 - (statistics.stdev(throughput_data) / statistics.mean(throughput_data) * 100) if len(throughput_data) > 1 else 100
                }
            
            # Quality metrics
            quality_metrics = {}
            if confidence_scores:
                high_quality = len([s for s in confidence_scores if s >= 80])
                medium_quality = len([s for s in confidence_scores if 60 <= s < 80])
                low_quality = len([s for s in confidence_scores if s < 60])
                total = len(confidence_scores)
                
                quality_metrics = {
                    'high_quality_percentage': (high_quality / total * 100) if total > 0 else 0,
                    'medium_quality_percentage': (medium_quality / total * 100) if total > 0 else 0,
                    'low_quality_percentage': (low_quality / total * 100) if total > 0 else 0,
                    'average_confidence': statistics.mean(confidence_scores)
                }
            
            # Error analysis
            error_metrics = {
                'total_errors': sum(error_counts),
                'average_daily_errors': statistics.mean(error_counts) if error_counts else 0,
                'error_rate_percentage': (sum(error_counts) / max(sum(throughput_data), 1) * 100) if throughput_data else 0
            }
            
            return {
                'report_period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': days
                },
                'performance_metrics': performance_metrics,
                'throughput_metrics': throughput_metrics,
                'quality_metrics': quality_metrics,
                'error_metrics': error_metrics,
                'recommendations': self._generate_performance_recommendations(
                    performance_metrics, throughput_metrics, quality_metrics, error_metrics
                ),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Performance report generation failed: {e}")
            return {'error': str(e)}
    
    def _generate_performance_recommendations(self, performance: Dict, throughput: Dict, 
                                            quality: Dict, errors: Dict) -> List[Dict]:
        """Generate performance improvement recommendations."""
        recommendations = []
        
        try:
            # Performance recommendations
            if performance.get('average_processing_time', 0) > 2.0:
                recommendations.append({
                    'category': 'performance',
                    'priority': 'high',
                    'title': 'Optimize Processing Time',
                    'description': f"Average processing time is {performance['average_processing_time']:.2f}s",
                    'suggestions': [
                        'Consider image preprocessing optimization',
                        'Evaluate OCR engine configuration',
                        'Check system resource availability',
                        'Consider parallel processing for batch operations'
                    ]
                })
            
            # Quality recommendations
            if quality.get('high_quality_percentage', 0) < 70:
                recommendations.append({
                    'category': 'quality',
                    'priority': 'medium',
                    'title': 'Improve OCR Quality',
                    'description': f"Only {quality.get('high_quality_percentage', 0):.1f}% of results are high quality",
                    'suggestions': [
                        'Review image preprocessing pipeline',
                        'Adjust OCR confidence thresholds',
                        'Consider alternative OCR configurations',
                        'Implement image quality validation'
                    ]
                })
            
            # Error recommendations
            if errors.get('error_rate_percentage', 0) > 3:
                recommendations.append({
                    'category': 'reliability',
                    'priority': 'high',
                    'title': 'Reduce Error Rate',
                    'description': f"Error rate is {errors.get('error_rate_percentage', 0):.1f}%",
                    'suggestions': [
                        'Implement better input validation',
                        'Add retry mechanisms for transient failures',
                        'Review error handling logic',
                        'Monitor system dependencies'
                    ]
                })
            
            # Throughput recommendations
            if throughput.get('throughput_consistency', 100) < 80:
                recommendations.append({
                    'category': 'consistency',
                    'priority': 'medium',
                    'title': 'Improve Throughput Consistency',
                    'description': f"Throughput consistency is {throughput.get('throughput_consistency', 0):.1f}%",
                    'suggestions': [
                        'Implement load balancing',
                        'Add resource monitoring',
                        'Consider auto-scaling mechanisms',
                        'Review system capacity planning'
                    ]
                })
            
        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            recommendations.append({
                'category': 'system',
                'priority': 'low',
                'title': 'Analysis Error',
                'description': 'Unable to generate specific recommendations',
                'suggestions': ['Review analytics data integrity']
            })
        
        return recommendations
    
    def export_analytics(self, format: str = 'json') -> str:
        """Export analytics data in specified format."""
        try:
            dashboard_data = self.get_dashboard_data(days=30)
            
            if format.lower() == 'json':
                return json.dumps(dashboard_data, indent=2)
            elif format.lower() == 'csv':
                # Simple CSV export of daily data
                csv_lines = ['Date,Processed,Avg_Time,Avg_Confidence,Error_Rate']
                for day in dashboard_data.get('daily_data', []):
                    csv_lines.append(f"{day['date']},{day['processed']},{day['avg_processing_time']:.3f},{day['avg_confidence']:.1f},{day['error_rate']:.2f}")
                return '\n'.join(csv_lines)
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            logger.error(f"Analytics export failed: {e}")
            return f"Export failed: {str(e)}"