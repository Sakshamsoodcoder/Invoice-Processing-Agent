import pytest
from app.db.base import Base
from app.db.session import engine
from seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
