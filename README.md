
# PerfAnalyzer

**PerfAnalyzer** is a professional, browser-based performance testing results analyzer. It allows engineers to analyze JTL (JMeter), CSV, and JSON test results instantly without server-side processing. It features a local-first architecture, ensuring data privacy while offering enterprise-grade reporting, baseline comparisons, and live test monitoring.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-v19-blue)
![TypeScript](https://img.shields.io/badge/typescript-v5-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)

## 🚀 Key Features

*   **Local-First Analysis**: Process multi-gigabyte JTL/CSV files entirely in the browser using Web Workers (no data upload).
*   **Baseline Comparison**: Upload a previous test run (Baseline) alongside your current run to visualize regressions, improvements, and metric deltas.
*   **Live Monitoring**: Watch active test files in real-time (Log Tailing) using the File System Access API.
*   **Hybrid AI Reporting**: 
    *   **Ollama (Local)**: Run Llama3, Mistral, or other models locally for private, offline AI analysis.
    *   **Google Gemini**: Integration for cloud-based deep-dive executive summaries.
    *   **Heuristic Engine**: Fallback rule-based analysis when no LLM is available.
*   **Deep Dive Error Inspector**: Analyze request/response bodies and headers with syntax highlighting to root cause failures.
*   **Session Preservation**: Save your full analysis state (datasets, thresholds, notes) to a `.perf` project file.
*   **Enterprise Reporting**: Generate PDF reports with customizable observations, comparison tables, and trend charts.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **Visualization**: Recharts (Dual-axis charts, Brushes, Heatmaps)
*   **Data Processing**: Papaparse (CSV), Native JSON parsing, Web Workers
*   **AI/LLM**: Google GenAI SDK, Ollama API
*   **Export**: html2pdf.js, Blob API

---

## 📊 Data Requirements

PerfAnalyzer supports **JMeter .jtl/.csv** and **k6 JSON** output.
For the best experience with JMeter, ensure your CSV Output configuration includes the following columns:

```csv
timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,bytes,sentBytes,grpThreads,allThreads,URL,Latency,Connect
```

*   **Optional**: For the Deep Dive Error Inspector, enable `Save Response Data (XML)` and `Save Request Headers` in JMeter, or provide a separate XML/JSON error log.

---

## 💻 Local Development Setup

### Prerequisites
*   Node.js v18 or higher
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/perf-analyzer.git
    cd perf-analyzer
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  (Optional) Configure AI Features:
    
    **Option A: Ollama (Local - Recommended)**
    To use Ollama, you must run it with CORS enabled so the browser can access it.
    ```bash
    # Linux / macOS
    OLLAMA_ORIGINS="*" ollama serve

    # Windows (PowerShell)
    $env:OLLAMA_ORIGINS="*"; ollama serve
    ```

    **Option B: Google Gemini**
    Create a `.env` file in the root:
    ```env
    API_KEY=your_google_gemini_api_key
    ```
    *You can also configure this in the UI Settings panel.*

4.  Start the development server:
    ```bash
    npm start
    ```
    Access the app at `http://localhost:3000`.

---

## 🐳 Docker Deployment

PerfAnalyzer allows for easy containerization using a multi-stage Docker build.

### 1. Create Dockerfile
Ensure you have a `Dockerfile` in the root:

```dockerfile
# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Optional: Add custom nginx config for SPA fallback
RUN echo "server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Build and Run
```bash
# Build the image
docker build -t perf-analyzer:latest .

# Run the container
docker run -d -p 8080:80 perf-analyzer:latest
```
Access at `http://localhost:8080`.

---

## ☸️ Kubernetes Deployment

Deploy to a K8s cluster using standard manifests.

### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: perf-analyzer
  labels:
    app: perf-analyzer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: perf-analyzer
  template:
    metadata:
      labels:
        app: perf-analyzer
    spec:
      containers:
      - name: perf-analyzer
        image: your-registry/perf-analyzer:latest
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: perf-analyzer-svc
spec:
  type: ClusterIP
  selector:
    app: perf-analyzer
  ports:
  - port: 80
    targetPort: 80
```

---

## 🌐 Production Ready Deployment (Static)

Since PerfAnalyzer is a client-side Single Page Application (SPA), it does not require a Node.js backend to run in production. It can be hosted on any static file storage or CDN.

### Build for Production
```bash
npm run build
```
This generates a `dist/` folder containing optimized assets.

### Hosting Options

1.  **AWS S3 + CloudFront**:
    *   Upload contents of `dist/` to an S3 bucket.
    *   Configure bucket for Static Website Hosting.
    *   Point CloudFront distribution to the bucket.

2.  **Netlify / Vercel**:
    *   Connect your Git repository.
    *   Set Build Command: `npm run build`
    *   Set Output Directory: `dist`

---

## 🛡️ Security & Privacy

*   **Local Processing**: All JTL/CSV parsing happens inside the user's browser memory via Web Workers. No test data is transmitted over the network unless the user explicitly exports a report or shares a screen.
*   **AI Privacy**: 
    *   **Ollama**: Runs completely locally. Your data never leaves your machine.
    *   **Gemini**: If used, only aggregated summary statistics are sent to the LLM API.
*   **Browser Support**: The **Live Monitoring** feature relies on the *File System Access API*, which is currently supported in Chrome, Edge, and Opera. Firefox and Safari users can still use all other features via standard file upload.

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
