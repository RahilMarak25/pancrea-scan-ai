# Complete Deployment Guide

This guide will help you deploy both your frontend (already hosted on Lovable) and your Flask ML backend.

## 🚀 Quick Start

### Step 1: Your GitHub Repository
✅ **Already Done!** - Your code is now in GitHub with the following structure:
```
your-repo/
├── frontend/ (React app - auto-deployed by Lovable)
├── backend/ (Flask API with your ML model)
└── DEPLOYMENT.md (this file)
```

### Step 2: Deploy Flask Backend

#### Option A: Railway (Recommended - Easiest)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   cd backend
   railway login
   railway deploy
   ```

3. **Get your URL** from Railway dashboard (e.g., `https://your-app.railway.app`)

#### Option B: Render (Free Tier Available)

1. Go to [Render.com](https://render.com)
2. Connect your GitHub account
3. Create a "New Web Service"
4. Select your repository
5. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
6. Deploy and get your URL

#### Option C: Heroku

1. **Install Heroku CLI** and login
2. **Deploy**:
   ```bash
   cd backend
   heroku create your-ml-api
   git subtree push --prefix backend heroku main
   ```

### Step 3: Update Frontend

1. **Get your deployed Flask API URL** (from step 2)
2. **Update the frontend** - In Lovable, update line 39 in `src/components/FileUploadSection.tsx`:
   ```typescript
   const ML_API_BASE_URL = 'https://your-actual-flask-api-url.com';
   ```
3. **That's it!** Lovable will auto-update your frontend

## 🧪 Testing Your Deployment

1. **Test Flask API**:
   ```bash
   curl https://your-flask-api-url.com/health
   ```

2. **Test from Frontend**:
   - Upload DICOM files through your Lovable app
   - Check browser console for any errors

## 🔍 Troubleshooting

### Backend Issues
- **Model not loading**: Ensure `BEST CNN2.keras` is in the backend directory
- **Memory errors**: Use a server with more RAM (upgrade your hosting plan)
- **CORS errors**: Check that flask-cors is installed and configured

### Frontend Issues
- **"Failed to fetch" errors**: Check the ML_API_BASE_URL is correct
- **CORS errors**: Ensure your Flask API has CORS enabled

## 📊 Model Information

Your Flask API includes these helpful endpoints:
- `GET /health` - Check if everything is working
- `GET /model-info` - Get details about your model
- `POST /api/v1/analyze-dicom` - Main analysis endpoint

## 🔄 Continuous Deployment

Since you're connected to GitHub:
- **Frontend**: Any changes you make in Lovable automatically sync to GitHub and deploy
- **Backend**: Push changes to the `backend/` folder to trigger redeployment

## 💡 Next Steps

1. **Monitor**: Set up logging/monitoring on your chosen platform
2. **Scale**: Upgrade your hosting plan if you need more performance
3. **Optimize**: Consider model quantization for faster inference
4. **Security**: Add API authentication if needed

## 🆘 Need Help?

If you run into issues:
1. Check the Flask API logs on your hosting platform
2. Test the `/health` endpoint first
3. Verify your model file is properly uploaded
4. Check CORS configuration

Your pancreatic tumor detection AI is ready to help save lives! 🏥✨