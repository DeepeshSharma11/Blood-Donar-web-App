from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from app.routers import ai

app = FastAPI(
    title="BloodDonar Support Service",
    description="Service for matching donors and checking eligibility",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager for Real-Time broadcasts
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Handle inactive or stale connections safely
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Wait for messages from any connected client
            data = await websocket.receive_text()
            # Broadcast the received message to all connected clients
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "BloodDonar Support Backend",
        "endpoints": ["/ai/match", "/ai/health-eligibility"],
        "websocket": "/ws"
    }

# Include routers
app.include_router(ai.router, prefix="/ai", tags=["Matching Features"])
