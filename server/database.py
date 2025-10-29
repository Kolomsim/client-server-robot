import os
import time

import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv

    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass


class Database:
    def __init__(self):
        self.connection = None
        self.cursor = None

    def connect(self):
        while True:
            try:
                self.connection = psycopg2.connect(
                    database=os.getenv("DB_NAME", "postgres"),
                    user=os.getenv("DB_USER", "postgres"),
                    password=os.getenv("DB_PASSWORD", ""),
                    host=os.getenv("DB_HOST", "localhost"),
                    port=os.getenv("DB_PORT", "5432"),
                    cursor_factory=RealDictCursor,
                )
                self.cursor = self.connection.cursor()
                return
            except psycopg2.DatabaseError as error:
                print("Error:", error)
                self.connection = None
                self.cursor = None
                time.sleep(2)

    def close(self):
        try:
            if self.cursor:
                self.cursor.close()
        except Exception:
            pass
        try:
            if self.connection:
                self.connection.close()
        except Exception:
            pass

    def get_database(self):
        if not (self.connection and self.cursor):
            self.connect()
        if not (self.connection and self.cursor):
            raise Exception("Failed to establish a database connection")
        return (
            self.connection,
            self.cursor,
            self.cursor.execute,
        )


db_instance = Database()


def get_db():
    return db_instance.get_database()


def db_get_task_by_id(task_id: int, db_cursor):
    query = "SELECT * FROM tasks WHERE task_id = %s;"
    db_cursor.execute(query, (task_id,))
    return db_cursor.fetchone()


def db_save(db_connection, db_cursor, query: str, values: tuple):
    try:
        db_cursor.execute(query, values)
        db_connection.commit()
        return db_cursor
    except Exception:
        try:
            db_connection.rollback()
        except Exception:
            pass
        raise
