import asyncio
import json
import math
import platform
import re
import subprocess
import time
from queue import Empty, Queue
from subprocess import PIPE
from threading import Thread
from typing import Any, Dict, Optional, Tuple

import aiohttp
import psutil
import serial
import websockets
from Transbot_Lib import Transbot

# ===== ИНИЦИАЛИЗАЦИЯ ==== #
bot = Transbot()
bot.create_receive_threading()
uri = "ws://192.168.1.130:8000/ws"
session_id = "Transbot"

# ===== НАВИГАЦИОННЫЕ ПАРАМЕТРЫ ===== #
POSITION_HISTORY_MAX = 10
MIN_MOVEMENT_DISTANCE = 1.5
TURN_ANGLE_THRESHOLD = 5.0

# ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===== #
position_history = []
total_distance = 0.0
trip_count = 0
mission_start_time = 0


# ===== НАВИГАЦИОННЫЕ ФУНКЦИИ ===== #


def calculate_turn_angle(current_bearing: float, target_bearing: float) -> float:
    """
    Вычисляет минимальный угол поворота от текущего направления к целевому.

    Параметры:
        current_bearing: Текущий азимут в градусах (0-359)
        target_bearing: Целевой азимут в градусах (0-359)

    Возвращает:
        Угол поворота в градусах (-180 до +180), где:
        - положительные значения = поворот направо
        - отрицательные значения = поворот налево
        - 0 = движение прямо на цель

    Пример:
        calculate_turn_angle(10, 30) → 20 (поворот направо на 20°)
        calculate_turn_angle(350, 10) → 20 (поворот направо на 20°)
        calculate_turn_angle(10, 350) → -20 (поворот налево на 20°)
    """
    angle = (target_bearing - current_bearing + 180) % 360 - 180
    return angle


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Вычисляет расстояние между двумя географическими точками по формуле гаверсинусов.
    Точность: ~0.5% (учитывает сферичность Земли).

    Параметры:
        lat1, lon1: Широта и долгота первой точки в градусах
        lat2, lon2: Широта и долгота второй точки в градусах

    Возвращает:
        Расстояние между точками в метрах

    Пример:
        haversine_distance(55.7558, 37.6176, 59.9343, 30.3351)
        → 634000 (расстояние Москва-Санкт-Петербург ~634 км)
    """
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Формула гаверсинусов
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Вычисляет начальный азимут (направление движения) от точки 1 к точке 2.

    Параметры:
        lat1, lon1: Исходная точка (широта, долгота в градусах)
        lat2, lon2: Целевая точка (широта, долгота в градусах)

    Возвращает:
        Азимут в градусах (0-359) относительно истинного севера:
        - 0° = север
        - 90° = восток
        - 180° = юг
        - 270° = запад

    Примечание:
        Азимут меняется по мере движения к цели (кроме движения точно по меридиану)
    """
    y = math.sin(math.radians(lon2 - lon1)) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - math.sin(
        math.radians(lat1)
    ) * math.cos(math.radians(lat2)) * math.cos(math.radians(lon2 - lon1))
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def update_position_history(lat: float, lon: float):
    """
    Обновляет историю позиций и вычисляет общее пройденное расстояние.

    Параметры:
        lat, lon: Текущие координаты (широта, долгота в градусах)

    Глобальные переменные:
        position_history: Список последних POSITION_HISTORY_MAX позиций
        total_distance: Суммарное пройденное расстояние (метры)

    Логика:
        1. Если история не пуста, вычисляет расстояние до предыдущей точки
        2. Добавляет расстояние к total_distance
        3. Добавляет текущую позицию в историю
        4. Поддерживает максимальный размер истории
    """
    global position_history, total_distance
    if position_history:
        last_lat, last_lon = position_history[-1]
        total_distance += haversine_distance(last_lat, last_lon, lat, lon)
    position_history.append((lat, lon))
    if len(position_history) > POSITION_HISTORY_MAX:
        position_history.pop(0)


def calculate_current_bearing() -> float:
    """
    Определяет текущее направление движения по истории позиций.

    Возвращает:
        Текущий азимут движения в градусах (0-359) или 0.0 если недостаточно данных

    Логика:
        1. Использует последние 2 точки для расчета направления
        2. Если точки слишком близки (<0.5м), использует третью точку для точности
        3. Возвращает 0.0 если точек меньше 2

    Особенности:
        - Устойчив к шумам GPS (использует усреднение при малом перемещении)
        - Требует предварительного вызова update_position_history()
    """
    if len(position_history) < 2:
        return 0.0
    lat1, lon1 = position_history[-2]
    lat2, lon2 = position_history[-1]
    if haversine_distance(lat1, lon1, lat2, lon2) < 0.5 and len(position_history) > 3:
        lat1, lon1 = position_history[-3]
    return calculate_bearing(lat1, lon1, lat2, lon2)


# ===== ФУНКЦИИ УПРАВЛЕНИЯ ДВИЖЕНИЕМ ===== #
def move_forward(speed=1):
    """
    Вызывает функцию класса Transbot для движения - set_car_motion(линейная скорость, угловая скорость).
    """
    bot.set_car_motion(speed, 0)


def adjust_direction_based_on_history(target_bearing: float):
    """
    Корректирует направление движения робота на основе истории позиций GPS.

    Параметры:
        target_bearing (float): Целевой азимут в градусах (0-359)

    Возвращает:
        float: Текущий расчетный азимут движения

    Логика работы:
        1. Проверяет наличие достаточной истории позиций (минимум 2 точки)
        2. Вычисляет текущее направление по последним точкам GPS
        3. При наличии 3+ точек использует усреднение для повышения точности
        4. Рассчитывает необходимый угол поворота
        5. Применяет сглаживание для плавности управления
        6. Если отклонение > порога (TURN_ANGLE_THRESHOLD):
           - Выполняет корректировку направления
           - Сохраняет движение вперед
        7. При малом отклонении продолжает движение прямо

    Особенности:
        - Использует глобальную переменную position_history
        - Автоматически нормализует углы
        - Коэффициент 0.5 (smoothed_turn_angle) обеспечивает плавность поворота
        - Деление на 45 - эмпирический коэффициент для преобразования угла в управляющий сигнал

    Пример:
        adjust_direction_based_on_history(90)  # Корректировка курса на восток
    """
    global position_history
    if len(position_history) < 2:
        return target_bearing

    # Вычисляем текущее направление по последним 2–3 точкам
    lat1, lon1 = position_history[-2]
    lat2, lon2 = position_history[-1]
    current_bearing = calculate_bearing(lat1, lon1, lat2, lon2)

    # Если история содержит более 3 точек, используем дополнительные для уточнения
    if len(position_history) > 3:
        lat1, lon1 = position_history[-3]
        lat2, lon2 = position_history[-1]
        additional_bearing = calculate_bearing(lat1, lon1, lat2, lon2)
        current_bearing = (
            current_bearing + additional_bearing
        ) / 2  # Усредняем направление

    # Вычисляем разницу между текущим и целевым направлением
    turn_angle = calculate_turn_angle(current_bearing, target_bearing)

    # Применяем сглаживание для корректировки угла
    smoothed_turn_angle = turn_angle * 0.5

    # Корректируем угол, если отклонение превышает порог
    if abs(turn_angle) > TURN_ANGLE_THRESHOLD:
        print(f"Adjusting direction by {smoothed_turn_angle:.1f}°")
        bot.set_car_motion(1, smoothed_turn_angle / 45)
    else:
        move_forward()

    return current_bearing


def stop_movement():
    bot.set_car_motion(0, 0)


# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===== #
def is_topic_active(topic_name):
    try:
        result = subprocess.run(
            ["rostopic", "list"], stdout=PIPE, stderr=PIPE, universal_newlines=True
        )
        return topic_name in result.stdout
    except:
        return False


def get_system_stats():
    return {
        "cpu_freq": psutil.cpu_freq().current if psutil.cpu_freq() else 0,
        "cpu_usage": psutil.cpu_percent(interval=1),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage("/").percent,
    }


# ===== КЛАСС GPS ЧТЕНИЯ ===== #
class GPSReader(Thread):
    def __init__(self, data_queue: Queue):
        super().__init__(daemon=True)
        self.data_queue = data_queue
        self.serial_port = "/dev/ttyUSB1"
        self.baudrate = 9600
        self.running = True
        self.gps_data = {}

    def run(self):
        try:
            ser = serial.Serial(self.serial_port, self.baudrate, timeout=1)
            print("GPS Serial Opened! Baudrate=9600")
            while self.running:
                if self._read_gps_data(ser):
                    self.data_queue.put_nowait(self.gps_data)
        except Exception as e:
            print(f"GPS Error: {e}")
        finally:
            if "ser" in locals():
                ser.close()
            print("GPS serial closed")

    def _read_gps_data(self, ser):
        if ser.inWaiting():
            if ser.read(1) == b"G":
                if ser.inWaiting() and ser.read(1) == b"N":
                    if ser.inWaiting():
                        choice = ser.read(1)
                        if choice == b"G":
                            return self._process_gga_message(ser)
                        elif choice == b"V":
                            return self._process_vtg_message(ser)
        return False

    def _process_gga_message(self, ser):
        if ser.inWaiting() >= 3 and ser.read(1) == b"G":
            if ser.inWaiting() and ser.read(1) == b"A":
                GGA = ser.read(70)
                GGA_str = GGA.decode(errors="ignore")
                GGA_g = GGA_str.split(",")
                if len(GGA_g) >= 15:
                    lat = float(GGA_g[2][:2]) + float(GGA_g[2][2:]) / 60
                    if GGA_g[3] == "S":
                        lat = -lat
                    lon = float(GGA_g[4][:3]) + float(GGA_g[4][3:]) / 60
                    if GGA_g[5] == "W":
                        lon = -lon
                    self.gps_data = {
                        "lat_decimal": lat,
                        "lon_decimal": lon,
                        "utctime": GGA_g[1],
                        "numSv": GGA_g[7],
                        "msl": GGA_g[9] if GGA_g[9] else None,
                    }
                    return True
        return False

    def _process_vtg_message(self, ser):
        if ser.inWaiting() >= 2 and ser.read(1) == b"T":
            if ser.inWaiting() and ser.read(1) == b"G":
                VTG = ser.read(40)
                VTG_g = re.findall(r"\d+\.?\d*", VTG.decode())
                if len(VTG_g) >= 8:
                    self.gps_data.update(
                        {
                            "sog": VTG_g[4],
                            "kph": VTG_g[6],
                        }
                    )
                    return True
        return False

    def stop(self):
        self.running = False


# ===== ОСНОВНАЯ ФУНКЦИЯ ===== #
async def websocket_sender(data_queue: Queue):
    global total_distance, trip_count, mission_start_time
    current_task = None
    current_target_index = 0
    mission_active = False
    last_update_time = time.time()

    try:
        async with websockets.connect(f"{uri}?session_id={session_id}") as ws:
            await ws.send(json.dumps({"role": "robot"}))
            response = await ws.recv()
            print(f"Connected: {response}")

            while True:
                try:
                    gps_data = data_queue.get_nowait()
                    lat = gps_data.get("lat_decimal", 0.0)
                    lon = gps_data.get("lon_decimal", 0.0)
                    update_position_history(lat, lon)
                    current_bearing = calculate_current_bearing()
                    system_stats = get_system_stats()

                    # Если нет новых данных GPS, прогнозируем положение
                    if not gps_data or (time.time() - last_update_time > 2):
                        if position_history:
                            last_lat, last_lon = position_history[-1]
                            speed_kph = (
                                float(gps_data.get("kph", 0)) or 5
                            )  # Используем последнюю известную скорость
                            speed_mps = speed_kph * 1000 / 3600
                            time_diff = time.time() - last_update_time
                            distance_traveled = speed_mps * time_diff
                            bearing = current_bearing
                            lat, lon = predict_next_position(
                                last_lat, last_lon, bearing, distance_traveled
                            )
                            update_position_history(lat, lon)
                            print(f"Predicted position: ({lat}, {lon})")

                    last_update_time = time.time()

                    # Обработка миссии
                    if current_task and current_task.get("route"):
                        if not mission_active:
                            mission_active = True
                            mission_start_time = time.time()
                            trip_count += 1
                            print("Mission started!")

                        target = current_task["route"][current_target_index]
                        target_lat = target.get("lat", 0.0)
                        target_lon = target.get("lng", 0.0)
                        distance = haversine_distance(lat, lon, target_lat, target_lon)

                        print(f"🎯 Distance to target: {distance:.1f}m")

                        if distance < MIN_MOVEMENT_DISTANCE:
                            print(f"Reached point {current_target_index + 1}")
                            stop_movement()
                            current_target_index += 1
                            if current_target_index >= len(current_task["route"]):
                                mission_duration = time.time() - mission_start_time
                                print(
                                    f"Mission complete! Duration: {mission_duration:.1f}s"
                                )
                                current_task = None
                                mission_active = False
                                position_history.clear()
                            continue

                        target_bearing = calculate_bearing(
                            lat, lon, target_lat, target_lon
                        )
                        adjust_direction_based_on_history(target_bearing)

                    # Подготовка телеметрии
                    telemetry = {
                        "deviceName": platform.node(),
                        "status": "Подключен",
                        "camera_ok": "OK"
                        if is_topic_active("/camera/image_raw")
                        else "Error",
                        "lidar_ok": "OK" if is_topic_active("/scan") else "Error",
                        "current_voltage": bot.get_battery_voltage() or 0,
                        "cpu_frequency": psutil.cpu_freq().current
                        if psutil.cpu_freq()
                        else 0,
                        "cpu_usage": psutil.cpu_percent(interval=1),
                        "memory_usage": psutil.virtual_memory().percent,
                        "data_exchange_latency": 0,
                        "total_distance": total_distance,
                        "avg_distance_per_task": total_distance / trip_count
                        if trip_count > 0
                        else 0,
                        "trip_count": trip_count,
                        "coordinates": {
                            "lat": lat,
                            "lng": lon,
                        },
                        "speed": {
                            "knots": gps_data.get("sog", ""),
                            "kph": gps_data.get("kph", ""),
                        },
                        "robot_id": 1,
                    }

                    await ws.send(json.dumps(telemetry))
                    print(
                        f"📤 Данные отправлены: 📍 Координаты ({telemetry['coordinates']['lat']}, {telemetry['coordinates']['lng']})"
                    )

                except Empty:
                    await asyncio.sleep(0.1)

                # Получение команд
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=0.1)
                    data = json.loads(message)
                    if data.get("type") == "new_task":
                        print("New mission received!")
                        current_task = {
                            "id": data.get("task_id"),
                            "route": data.get("route", []),
                        }
                        current_target_index = 0
                except asyncio.TimeoutError:
                    pass
                except Exception as e:
                    print(f"Error receiving data: {e}")
    except Exception as e:
        print(f"WebSocket error: {e}")


# ===== Новая функция прогнозирования ===== #
def predict_next_position(
    lat: float, lon: float, bearing: float, distance: float
) -> Tuple[float, float]:
    """
    Вычисляет следующую позицию на основе текущего местоположения, направления и пройденного расстояния.
    Использует сферическую модель Земли (формулы гаверсинусов).

    Параметры:
        lat (float): Текущая широта в градусах (-90 до 90)
        lon (float): Текущая долгота в градусах (-180 до 180)
        bearing (float): Направление движения в градусах (0-359, 0 = север)
        distance (float): Пройденное расстояние в метрах

    Возвращает:
        Tuple[float, float]: Новые координаты (широта, долгота) в градусах

    Математическая основа:
        Формулы вычисления точки по азимуту и расстоянию на сфере:
        1. new_lat = asin(sin(lat1)*cos(d/R) + cos(lat1)*sin(d/R)*cos(θ))
        2. new_lon = lon1 + atan2(sin(θ)*sin(d/R)*cos(lat1), cos(d/R)-sin(lat1)*sin(lat2))
        где d - расстояние, R - радиус Земли, θ - азимут
    """

    # Радиус Земли в метрах (среднее значение для WGS84)
    R = 6371000

    # Угловое расстояние (в радианах) = линейное расстояние / радиус сферы
    # Показывает, на какой угол мы сместимся по поверхности Земли
    delta = distance / R

    # Конвертируем азимут из градусов в радианы для тригонометрических функций
    theta = math.radians(bearing)

    # Текущие координаты в радианах
    phi1 = math.radians(lat)  # Текущая широта (φ)
    lambda1 = math.radians(lon)  # Текущая долгота (λ)

    # Вычисление новой широты (φ2):
    # Основано на сферической теореме косинусов
    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta)  # Вертикальная составляющая
        + math.cos(phi1)
        * math.sin(delta)
        * math.cos(theta)  # Горизонтальная составляющая
    )

    # Вычисление новой долготы (λ2):
    # Учитывает изменение долготы в зависимости от широты
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),  # Изменение по долготе
        math.cos(delta) - math.sin(phi1) * math.sin(phi2),  # Коррекция для сферичности
    )

    # Конвертируем результат обратно в градусы
    return math.degrees(phi2), math.degrees(lambda2)


# ===== ОСНОВНАЯ ТОЧКА ВХОДА ===== #
async def main():
    data_queue = Queue()
    gps_reader = GPSReader(data_queue)
    gps_reader.start()

    try:
        await websocket_sender(data_queue)
    finally:
        gps_reader.stop()
        gps_reader.join()


if __name__ == "__main__":
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(main())
    except KeyboardInterrupt:
        print("Завершение работы...")
    finally:
        del bot
        if "loop" in locals():
            loop.close()
