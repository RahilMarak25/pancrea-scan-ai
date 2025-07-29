from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import pydicom
import cv2
import io
import time
from PIL import Image
import logging
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load your trained model
MODEL_PATH = './BEST CNN2.keras'
model = None

def load_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = tf.keras.models.load_model(MODEL_PATH)
            logger.info("Model loaded successfully")
            logger.info(f"Model input shape: {model.input_shape}")
            return True
        else:
            logger.error(f"Model file not found at {MODEL_PATH}")
            return False
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

def preprocess_dicom(dicom_file):
    """Preprocess DICOM file for model prediction"""
    try:
        # Read DICOM file
        dicom_data = pydicom.dcmread(io.BytesIO(dicom_file.read()))
        
        # Get pixel array
        pixel_array = dicom_data.pixel_array
        
        # Convert to float32
        pixel_array = pixel_array.astype(np.float32)
        
        # Apply window/level if available
        if hasattr(dicom_data, 'WindowCenter') and hasattr(dicom_data, 'WindowWidth'):
            center = dicom_data.WindowCenter
            width = dicom_data.WindowWidth
            if isinstance(center, list):
                center = center[0]
            if isinstance(width, list):
                width = width[0]
            
            lower = center - width // 2
            upper = center + width // 2
            pixel_array = np.clip(pixel_array, lower, upper)
            pixel_array = (pixel_array - lower) / (upper - lower) * 255
        else:
            # Normalize to 0-255 range
            pixel_array = ((pixel_array - pixel_array.min()) / 
                          (pixel_array.max() - pixel_array.min()) * 255)
        
        # Get model input shape (adjust based on your model)
        if model is not None:
            input_shape = model.input_shape
            target_height = input_shape[1] if input_shape[1] is not None else 224
            target_width = input_shape[2] if input_shape[2] is not None else 224
            target_channels = input_shape[3] if len(input_shape) > 3 else 1
        else:
            target_height, target_width, target_channels = 224, 224, 3
        
        # Resize image
        pixel_array = cv2.resize(pixel_array, (target_width, target_height))
        
        # Handle channels
        if target_channels == 3 and len(pixel_array.shape) == 2:
            # Convert grayscale to RGB
            pixel_array = cv2.cvtColor(pixel_array.astype(np.uint8), cv2.COLOR_GRAY2RGB)
        elif target_channels == 1 and len(pixel_array.shape) == 3:
            # Convert RGB to grayscale
            pixel_array = cv2.cvtColor(pixel_array.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            pixel_array = np.expand_dims(pixel_array, axis=-1)
        
        # Normalize for model (common range: 0-1)
        pixel_array = pixel_array / 255.0
        
        # Add batch dimension
        pixel_array = np.expand_dims(pixel_array, axis=0)
        
        return pixel_array
        
    except Exception as e:
        logger.error(f"Error preprocessing DICOM: {e}")
        return None

@app.route('/api/v1/analyze-dicom', methods=['POST'])
def analyze_dicom():
    start_time = time.time()
    
    if model is None:
        return jsonify({'error': 'Model not loaded. Please check server logs.'}), 500
    
    try:
        # Get uploaded files
        files = request.files.getlist('dicom_files')
        user_id = request.form.get('user_id', '')
        analysis_type = request.form.get('analysis_type', 'pancreatic_tumor_detection')
        
        if not files:
            return jsonify({'error': 'No DICOM files provided'}), 400
        
        logger.info(f"Processing {len(files)} DICOM files for user {user_id}")
        
        predictions = []
        processed_files = 0
        
        for file in files:
            if file.filename.lower().endswith('.dcm') or file.filename.lower().endswith('.dicom'):
                try:
                    # Reset file pointer
                    file.seek(0)
                    
                    # Preprocess the DICOM file
                    processed_image = preprocess_dicom(file)
                    
                    if processed_image is not None:
                        # Make prediction
                        prediction = model.predict(processed_image, verbose=0)
                        predictions.append(prediction[0])
                        processed_files += 1
                        logger.info(f"Processed {file.filename}: prediction shape {prediction[0].shape}")
                    
                except Exception as e:
                    logger.error(f"Error processing file {file.filename}: {e}")
                    continue
        
        if not predictions:
            return jsonify({'error': 'No valid DICOM files could be processed'}), 400
        
        # Aggregate predictions
        predictions_array = np.array(predictions)
        avg_prediction = np.mean(predictions_array, axis=0)
        
        # Handle different output formats
        if len(avg_prediction.shape) == 0:  # Single value
            confidence = float(avg_prediction)
            predicted_class = 1 if confidence > 0.5 else 0
        elif avg_prediction.shape[0] == 1:  # Single output neuron (binary)
            confidence = float(avg_prediction[0])
            predicted_class = 1 if confidence > 0.5 else 0
        else:  # Multiple output neurons
            predicted_class = int(np.argmax(avg_prediction))
            confidence = float(np.max(avg_prediction))
        
        # Map prediction to meaningful result
        if predicted_class == 0:
            result = "No tumor detected"
        else:
            result = "Tumor detected"
        
        processing_time = time.time() - start_time
        
        response = {
            'prediction': result,
            'confidence': confidence,
            'processed_files': processed_files,
            'total_files': len(files),
            'processing_time': processing_time,
            'model_version': 'BEST_CNN2_v1.0',
            'analysis_details': {
                'avg_prediction_raw': avg_prediction.tolist(),
                'individual_predictions': len(predictions)
            }
        }
        
        logger.info(f"Analysis complete: {result} with {confidence:.3f} confidence")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in analysis: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'model_exists': os.path.exists(MODEL_PATH)
    })

@app.route('/model-info', methods=['GET'])
def model_info():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        return jsonify({
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'model_summary': str(model.summary()),
            'total_params': model.count_params()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    if load_model():
        logger.info(f"Starting Flask app on port {port}")
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        print("Failed to load model. Please check that BEST CNN2.keras exists in the backend directory.")