# routes.py
import json
import time
from datetime import datetime
from typing import Dict, List

from database import get_db
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

router = APIRouter()


# login test
@router.get("/login")
async def read_users(db=Depends(get_db)):
    _, cursor, execute = db
    execute("SELECT * FROM users")
    users = cursor.fetchall()
    return {"users": users}


class ConnectionManager:
    def __init__(self):
        self.robots: List[WebSocket] = []
        self.operators: List[WebSocket] = []
        self.robot_statuses: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] Новое подключение: {websocket.client}"
        )

    async def send_status_summary(self):
        status_summary = {
            "type": "robot_status_summary",
            "statuses": self.calculate_status_summary(),
            "connected_robots": len(self.robots),
        }
        await self.send_to_operators(json.dumps(status_summary))

    def calculate_status_summary(self):
        summary = {}
        for status in self.robot_statuses.values():
            summary[status] = summary.get(status, 0) + 1
        return summary

    def register(self, websocket: WebSocket, role: str):
        if role == "robot":
            self.robots.append(websocket)
            self.robot_statuses[str(id(websocket))] = "unknown"
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] New ROB: {len(self.robots)}"
            )
        elif role == "operator":
            self.operators.append(websocket)
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] New OP: {len(self.operators)}"
            )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.robots:
            self.robots.remove(websocket)
            ws_id = str(id(websocket))
            if ws_id in self.robot_statuses:
                del self.robot_statuses[ws_id]
        if websocket in self.operators:
            self.operators.remove(websocket)

    async def send_to_operators(self, message: str):
        if not self.operators:
            print("⚠️ No OPs")
            return

        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] Отправка операторам ({len(self.operators)} шт): {message}"
        )
        for conn in self.operators:
            try:
                await conn.send_text(message)
            except Exception as e:
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Ошибка отправки оператору: {e}"
                )
                self.operators.remove(conn)

    async def send_to_robots(self, message: str):
        if not self.robots:
            return

        print(f"📤 Отправка роботам ({len(self.robots)} шт): {message}")
        for conn in self.robots:
            try:
                await conn.send_text(message)
            except Exception as e:
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Ошибка отправки роботу: {e}"
                )
                self.robots.remove(conn)

    async def handle_ping(self, websocket: WebSocket, data: dict):
        if data.get("type") == "ping":
            response = {
                "type": "pong",
                "timestamp": data["timestamp"],
                "server_time": time.time(),
            }
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Ping -pong")
            await websocket.send_text(json.dumps(response))


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        data = await websocket.receive_text()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Первое сообщение: {data}")

        init_data = json.loads(data)
        role = init_data.get("role")
        manager.register(websocket, role)

        if role == "robot":
            response = {"status": "connected"}
            await websocket.send_text(json.dumps(response))
            await manager.send_status_summary()

        while True:
            data = await websocket.receive_text()
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] Получено сообщение от {role}: {data}"
            )

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.close(code=1003)
                return

            if message.get("type") in ["ping", "pong"]:
                await manager.handle_ping(websocket, message)
                continue

            if role == "robot":
                if "status" in message:
                    ws_id = str(id(websocket))
                    manager.robot_statuses[ws_id] = message["status"]
                    print(f"🔄 Статус робота обновлен: {message['status']}")
                    await manager.send_status_summary()

                print("🔄 Перенаправляю данные от робота операторам")
                await manager.send_to_operators(data)

            if role == "operator":
                print("🔄 Перенаправляю данные от оператора роботам")
                await manager.send_to_robots(data)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print({e})
        await websocket.close(code=1011)


@router.post("/routes/")
async def create_route(route: dict, db=Depends(get_db)):
    db_connection, db_cursor, _ = db
    try:
        print(f"Полученные данные для маршрута: {route}")
        query = """
        INSERT INTO routes (name, coordinates, creation_date)
        VALUES (%s, %s, NOW())
        RETURNING route_id;
        """
        db_cursor.execute(query, (route["name"], json.dumps(route["coordinates"])))
        db_connection.commit()
        route_id = db_cursor.fetchone()["route_id"]
        return {"route_id": route_id}
    except Exception as e:
        db_connection.rollback()
        print(f"Error creating route: {e}")
        raise HTTPException(status_code=500, detail="Failed to create route")


@router.get("/routes/")
async def get_routes(db=Depends(get_db)):
    db_cursor, _ = db
    try:
        query = "SELECT route_id, name, coordinates FROM routes;"
        db_cursor.execute(query)
        routes = db_cursor.fetchall()
        return {"routes": routes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Маршрут для создания задачи
@router.post("/tasks/")
async def create_task(task: dict, db=Depends(get_db)):
    db_connection, db_cursor, _ = db
    try:
        query = """
        INSERT INTO tasks (route_id, robot_id, start_time, end_time, description)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING task_id;
        """
        db_cursor.execute(
            query,
            (
                task["route_id"],
                task["robot_id"],
                task["start_time"],
                task.get("end_time"),
                task["description"],
            ),
        )
        db_connection.commit()
        task_id = db_cursor.fetchone()["task_id"]

        # Получение координат маршрута по route_id
        route_query = "SELECT coordinates FROM routes WHERE route_id = %s;"
        db_cursor.execute(route_query, (task["route_id"],))
        route_data = db_cursor.fetchone()

        if not route_data or "coordinates" not in route_data:
            raise ValueError(
                f"Маршрут с ID {task['route_id']} не найден или не содержит координат."
            )

        route_coordinates = route_data["coordinates"]

        message = {
            "type": "new_task",
            "task_id": task_id,
            "route_id": task["route_id"],
            "route": route_coordinates,
            "robot_id": task["robot_id"],
            "start_time": task["start_time"],
            "description": task["description"],
        }

        await manager.send_to_robots(json.dumps(message))

        return {"status": "success", "task_id": task_id}
    except Exception as e:
        db_connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Маршрут для получения всех задач
@router.get("/tasks/")
async def get_tasks(db=Depends(get_db)):
    db_cursor, _ = db
    try:
        query = """
        SELECT t.task_id, t.route_id, t.robot_id, t.start_time, t.end_time, t.description, t.progress,
            r.name AS route_name, r.coordinates
        FROM tasks t
        JOIN routes r ON t.route_id = r.route_id;
        """
        db_cursor.execute(query)
        tasks = db_cursor.fetchall()
        return {"tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/robots/")
async def create_robot(robot: dict, db=Depends(get_db)):
    db_connection, db_cursor, _ = db
    try:
        query = """
        INSERT INTO robots (name, commissioning_date, last_maintenance_date, service_life)
        VALUES (%s, %s, %s, %s)
        RETURNING robot_id;
        """
        db_cursor.execute(
            query,
            (
                robot["name"],
                robot["commissioning_date"],
                robot["last_maintenance_date"],
                robot["service_life"],
            ),
        )
        db_connection.commit()
        robot_id = db_cursor.fetchone()["robot_id"]
        return {"robot_id": robot_id}
    except Exception as e:
        db_connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/robots/")
async def get_robots(db=Depends(get_db)):
    _, cursor, execute = db
    execute("SELECT * FROM robots")
    robots = cursor.fetchall()
    return {"robots": robots}


class ProgressUpdate(BaseModel):
    task_id: int
    progress: float


@router.patch("/tasks/progress/")
async def update_task_progress(data: ProgressUpdate, db=Depends(get_db)):
    db_connection, db_cursor, _ = db
    try:
        db_cursor.execute("SELECT * FROM tasks WHERE task_id = %s;", (data.task_id,))
        task = db_cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        db_cursor.execute(
            "UPDATE tasks SET progress = %s WHERE task_id = %s;",
            (data.progress, data.task_id),
        )
        db_connection.commit()
        return {"status": "success"}
    except Exception as e:
        db_connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
