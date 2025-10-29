from datetime import datetime, timedelta
from uuid import UUID, uuid4

import bcrypt
from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi_sessions.backends.implementations import InMemoryBackend
from fastapi_sessions.frontends.implementations import CookieParameters, SessionCookie
from fastapi_sessions.session_verifier import SessionVerifier
from pydantic import BaseModel

expiry_time = datetime.now() + timedelta(hours=1)

router = APIRouter()


def check_sessionPeriod(nowTime: datetime):
    if nowTime - expiry_time > 1:
        return 1
    else:
        return 0


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


db_connection, cursor, _ = get_db()


def getLogin(username: str, password: str):
    query = "SELECT * FROM users WHERE username = %s;"
    cursor.execute(query, (username,))
    user = cursor.fetchone()
    if user and verify_password(password, user["password"]):
        return user
    return None


# authorization module
class SessionData(BaseModel):
    username: str
    createTime: datetime
    expiryTime: datetime


class LoginData(BaseModel):
    username: str
    password: str


cookie_params = CookieParameters()

cookie = SessionCookie(
    cookie_name="cookie",
    identifier="general_verifier",
    auto_error=True,
    secret_key="DONOTUSE",
    cookie_params=cookie_params,
)

backend = InMemoryBackend[UUID, SessionData]()


class BasicVerifier(SessionVerifier[UUID, SessionData]):
    def __init__(
        self,
        *,
        identifier: str,
        auto_error: bool,
        backend: InMemoryBackend[UUID, SessionData],
        auth_http_exception: HTTPException,
    ):
        self._identifier = identifier
        self._auto_error = auto_error
        self._backend = backend
        self._auth_http_exception = auth_http_exception

    @property
    def identifier(self):
        return self._identifier

    @property
    def backend(self):
        return self._backend

    @property
    def auto_error(self):
        return self._auto_error

    @property
    def auth_http_exception(self):
        return self._auth_http_exception

    def verify_session(self, model: SessionData) -> bool:
        if datetime.now() > model.expiryTime:
            return False
        return True


verifier = BasicVerifier(
    identifier="general_verifier",
    auto_error=True,
    backend=backend,
    auth_http_exception=HTTPException(status_code=403, detail="invalid session"),
)


@router.post("/create_session/")
async def create_session(userData: LoginData, response: Response):
    user = getLogin(userData.username, userData.password)

    if user:
        session = uuid4()
        now = datetime.now()
        expiry = now + timedelta(hours=1)
        data = SessionData(
            username=userData.username, createTime=now, expiryTime=expiry
        )

        await backend.create(session, data)
        cookie.attach_to_response(response, session)

        return {
            "message": f"Created session for {userData.username}",
            "session_id": str(session),
        }

    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.get("/whoami", dependencies=[Depends(cookie)])
async def whoami(session_data: SessionData = Depends(verifier)):
    return session_data


@router.post("/delete_session")
async def del_session(response: Response, session_id: UUID = Depends(cookie)):
    await backend.delete(session_id)
    cookie.delete_from_response(response)
    return "deleted session"


async def clear_expired_sessions():
    all_sessions = await backend.list()
    now = datetime.now()

    for session_id in all_sessions:
        session_data = await backend.read(session_id)
        if session_data and now > session_data.expiryTime:
            await backend.delete(session_id)


# test
class UserCreate(BaseModel):
    username: str
    password: str


@router.post("/create_user/")
async def create_user(userData: UserCreate):
    if userData.username and userData.password:
        hashed_password = bcrypt.hashpw(
            userData.password.encode(), bcrypt.gensalt()
        ).decode()
        query = "INSERT INTO users (username, password) VALUES (%s, %s);"
        try:
            print((userData.username, hashed_password))
            cursor.execute(query, (userData.username, hashed_password))
            db_connection.commit()
            return {"message": "User created successfully"}
        except Exception as error:
            db_connection.rollback()
            return {"message": "Failed to create user", "error": str(error)}
