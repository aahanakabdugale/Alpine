# Import Base and all models so Base.metadata contains all tables
from app.db.session import Base  # noqa: F401
from app.db import models  # noqa: F401
