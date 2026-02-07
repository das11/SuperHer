from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_V1_STR: str
    
    # Database
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_SERVER: str
    MYSQL_PORT: int
    MYSQL_DB: str
    
    # Secret Key for JWT
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str]

    # AWS Cognito
    COGNITO_REGION: Optional[str] = "us-east-1"
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_APP_CLIENT_ID: Optional[str] = None
    COGNITO_AWS_ACCESS_KEY_ID: Optional[str] = None
    COGNITO_AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # AWS SES (Email)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: Optional[str] = "us-east-1"
    SENDER_EMAIL: Optional[str] = "noreply@superher.in"

    model_config = SettingsConfigDict(
        case_sensitive=True, 
        env_file="../.env", 
        env_file_encoding='utf-8', 
        extra='ignore'
    )

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

settings = Settings()
