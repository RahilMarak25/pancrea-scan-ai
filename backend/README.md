# Pancreatic Tumor Detection API

This Flask API serves your trained Keras model for pancreatic tumor detection from DICOM images.

## Setup

1. **Copy your model file**:
   - Place your `BEST CNN2.keras` model file in this `backend` directory

2. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Run locally**:
   ```bash
   python app.py
   ```

## Deployment Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway deploy
```

### Option 2: Render
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python app.py`
5. Upload your `BEST CNN2.keras` file to the service

### Option 3: Heroku
```bash
cd backend
heroku create your-ml-api
git subtree push --prefix backend heroku main
```

### Option 4: Docker
```bash
cd backend
docker build -t pancreatic-ai .
docker run -p 8000:8000 pancreatic-ai
```

## API Endpoints

- `POST /api/v1/analyze-dicom` - Analyze DICOM files
- `GET /health` - Health check
- `GET /model-info` - Model information

## Testing

Test your deployment:
```bash
curl https://your-api-url.com/health
```

## Important Notes

1. **Model File**: Ensure `BEST CNN2.keras` is in the backend directory
2. **Preprocessing**: The preprocessing might need adjustment based on how your model was trained
3. **Input Shape**: The code auto-detects your model's input shape
4. **Memory**: For large models, consider using a machine with more RAM

## Troubleshooting

- Check logs for model loading errors
- Verify DICOM file format compatibility
- Ensure model input preprocessing matches training data