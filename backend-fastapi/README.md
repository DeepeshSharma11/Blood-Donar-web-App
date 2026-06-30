# BloodDonar AI Service (FastAPI)

This is the AI service backend for donor matchmaking, location-based query recommendations, and health eligibility pre-screens.

## Setup

1.  Create virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Running the Service

Start the FastAPI application:
```bash
uvicorn app.main:app --reload --port 8000
```
The service will start on `http://localhost:8000`. 
API Documentation will be available at `http://localhost:8000/docs`.
