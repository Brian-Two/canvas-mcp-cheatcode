#!/usr/bin/env python3
"""
ASTAR Learning Effectiveness ML Pipeline
Trains clustering and classification models on Canvas + session data
"""

import pandas as pd
import numpy as np
import json
import joblib
from pathlib import Path
import argparse

# ML libraries
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_recall_fscore_support, roc_auc_score
)
import matplotlib.pyplot as plt
import seaborn as sns

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

class LearningEffectivenessPipeline:
    def __init__(self, data_path='../data/training_sample.csv'):
        self.data_path = Path(data_path)
        self.models_dir = Path('../models')
        self.reports_dir = Path('../reports')
        self.models_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
        
        self.df = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.scaler = None
        self.kmeans = None
        self.classifier = None
        
    def load_data(self):
        """Load and prepare training data"""
        print("📊 Loading data...")
        self.df = pd.read_csv(self.data_path)
        print(f"  Loaded {len(self.df)} samples with {self.df.shape[1]} features")
        return self
    
    def preprocess(self):
        """Feature engineering and preprocessing"""
        print("\n🔧 Preprocessing...")
        
        # Define feature sets
        behavioral_features = [
            'num_sessions', 'num_messages', 'avg_messages_per_session',
            'used_step_mode', 'num_concepts', 'num_context_items',
            'session_duration_hours', 'session_span_days',
            'message_length_avg', 'question_ratio', 'engagement_score'
        ]
        
        temporal_features = ['days_until_due', 'early_start_days']
        assignment_features = ['points_possible', 'submission_types_count']
        
        all_features = behavioral_features + temporal_features + assignment_features
        
        # Prepare X and y
        X = self.df[all_features].copy()
        y = self.df['is_completed'].copy()
        
        # Train/test split
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Standardize features
        self.scaler = StandardScaler()
        self.X_train = self.scaler.fit_transform(self.X_train)
        self.X_test = self.scaler.transform(self.X_test)
        
        print(f"  Train set: {len(self.X_train)} samples")
        print(f"  Test set: {len(self.X_test)} samples")
        print(f"  Features: {len(all_features)}")
        print(f"  Completion rate (train): {self.y_train.mean():.2%}")
        
        return self
    
    def train_clustering(self, n_clusters=3):
        """Train K-Means clustering model"""
        print(f"\n🎯 Training K-Means clustering (k={n_clusters})...")
        
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.kmeans.fit(self.X_train)
        
        # Save model
        joblib.dump(self.kmeans, self.models_dir / 'kmeans_model.pkl')
        print(f"  ✅ K-Means model saved")
        
        return self
    
    def train_classifier(self, model_type='random_forest'):
        """Train classification model"""
        print(f"\n🤖 Training {model_type} classifier...")
        
        if model_type == 'logistic_regression':
            self.classifier = LogisticRegression(random_state=42, max_iter=1000)
        elif model_type == 'random_forest':
            self.classifier = RandomForestClassifier(
                n_estimators=100, random_state=42, max_depth=10
            )
        elif model_type == 'gradient_boosting':
            self.classifier = GradientBoostingClassifier(
                n_estimators=100, random_state=42, max_depth=5
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Train model
        self.classifier.fit(self.X_train, self.y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(self.classifier, self.X_train, self.y_train, cv=5)
        print(f"  Cross-validation accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
        
        # Save model
        joblib.dump(self.classifier, self.models_dir / 'classifier.pkl')
        joblib.dump(self.scaler, self.models_dir / 'scaler.pkl')
        print(f"  ✅ Classifier saved")
        
        return self
    
    def evaluate(self):
        """Evaluate classifier performance"""
        print("\n📈 Evaluating model...")
        
        # Predictions
        y_pred = self.classifier.predict(self.X_test)
        y_pred_proba = self.classifier.predict_proba(self.X_test)[:, 1]
        
        # Metrics
        accuracy = accuracy_score(self.y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            self.y_test, y_pred, average='binary'
        )
        
        try:
            roc_auc = roc_auc_score(self.y_test, y_pred_proba)
        except:
            roc_auc = None
        
        print(f"\n  Accuracy:  {accuracy:.3f}")
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall:    {recall:.3f}")
        print(f"  F1 Score:  {f1:.3f}")
        if roc_auc:
            print(f"  ROC-AUC:   {roc_auc:.3f}")
        
        # Classification report
        print("\n📋 Classification Report:")
        print(classification_report(self.y_test, y_pred, 
                                   target_names=['Not Completed', 'Completed']))
        
        # Confusion matrix
        cm = confusion_matrix(self.y_test, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=['Not Completed', 'Completed'],
                   yticklabels=['Not Completed', 'Completed'])
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(self.reports_dir / 'confusion_matrix.png', dpi=300, bbox_inches='tight')
        print(f"\n  ✅ Confusion matrix saved")
        
        # Feature importance (if available)
        if hasattr(self.classifier, 'feature_importances_'):
            feature_names = [
                'num_sessions', 'num_messages', 'avg_messages_per_session',
                'used_step_mode', 'num_concepts', 'num_context_items',
                'session_duration_hours', 'session_span_days',
                'message_length_avg', 'question_ratio', 'engagement_score',
                'days_until_due', 'early_start_days',
                'points_possible', 'submission_types_count'
            ]
            
            importances = self.classifier.feature_importances_
            indices = np.argsort(importances)[::-1][:10]
            
            print("\n🔝 Top 10 Feature Importances:")
            for i, idx in enumerate(indices, 1):
                print(f"  {i}. {feature_names[idx]}: {importances[idx]:.4f}")
            
            # Plot feature importance
            plt.figure(figsize=(10, 6))
            plt.barh(range(10), importances[indices][::-1])
            plt.yticks(range(10), [feature_names[i] for i in indices][::-1])
            plt.xlabel('Importance')
            plt.title('Top 10 Feature Importances')
            plt.tight_layout()
            plt.savefig(self.reports_dir / 'feature_importance.png', dpi=300, bbox_inches='tight')
            print(f"  ✅ Feature importance plot saved")
        
        # Save metrics
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc) if roc_auc else None,
            'test_samples': len(self.y_test),
            'confusion_matrix': cm.tolist()
        }
        
        with open(self.reports_dir / 'metrics.json', 'w') as f:
            json.dump(metrics, f, indent=2)
        
        print(f"\n  ✅ Metrics saved to {self.reports_dir / 'metrics.json'}")
        
        return self
    
    def predict(self, input_data):
        """Make predictions on new data"""
        if self.classifier is None:
            self.classifier = joblib.load(self.models_dir / 'classifier.pkl')
            self.scaler = joblib.load(self.models_dir / 'scaler.pkl')
        
        X = self.scaler.transform(input_data)
        predictions = self.classifier.predict(X)
        probabilities = self.classifier.predict_proba(X)
        
        return predictions, probabilities


def main():
    parser = argparse.ArgumentParser(description='ASTAR Learning Effectiveness ML Pipeline')
    parser.add_argument('--mode', choices=['train', 'eval', 'predict'], default='train',
                       help='Pipeline mode: train, eval, or predict')
    parser.add_argument('--model', choices=['logistic_regression', 'random_forest', 'gradient_boosting'],
                       default='random_forest', help='Classifier type')
    parser.add_argument('--data', default='../data/training_sample.csv',
                       help='Path to training data CSV')
    
    args = parser.parse_args()
    
    print("🚀 ASTAR Learning Effectiveness ML Pipeline")
    print("=" * 60)
    
    pipeline = LearningEffectivenessPipeline(data_path=args.data)
    
    if args.mode == 'train':
        pipeline.load_data() \
                .preprocess() \
                .train_clustering(n_clusters=3) \
                .train_classifier(model_type=args.model) \
                .evaluate()
        
        print("\n" + "=" * 60)
        print("✅ Pipeline complete! Models and reports saved.")
        print(f"   Models: {pipeline.models_dir}")
        print(f"   Reports: {pipeline.reports_dir}")
    
    elif args.mode == 'eval':
        pipeline.load_data() \
                .preprocess()
        pipeline.classifier = joblib.load(pipeline.models_dir / 'classifier.pkl')
        pipeline.scaler = joblib.load(pipeline.models_dir / 'scaler.pkl')
        pipeline.evaluate()
    
    elif args.mode == 'predict':
        print("Predict mode: Load your input CSV and call pipeline.predict()")


if __name__ == '__main__':
    main()

