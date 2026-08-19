import logging
from typing import Optional
from neo4j import GraphDatabase, Driver, AsyncGraphDatabase, AsyncDriver
from app.config import settings

logger = logging.getLogger("fingraph.db")


class Neo4jConnection:
    def __init__(self):
        self._driver: Optional[Driver] = None
        self._is_connected: bool = False

    def connect(self):
        try:
            logger.info(f"Connecting to Neo4j at {settings.NEO4J_URI}...")
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.neo4j_auth_user, settings.NEO4J_PASSWORD),
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
                connection_acquisition_timeout=10.0
            )
            # Verify connectivity
            self._driver.verify_connectivity()
            self._is_connected = True
            logger.info("Successfully connected to Neo4j!")
            self._initialize_schema_constraints()
        except Exception as e:
            self._is_connected = False
            logger.warning(
                f"Could not connect to live Neo4j database ({e}). "
                "Operating in resilient Hybrid/Fallback mode until live Neo4j credentials are provided."
            )

    def _initialize_schema_constraints(self):
        """Creates unique constraints and indexes for high-performance graph lookups."""
        if not self._driver or not self._is_connected:
            return

        constraints = [
            "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT group_id_unique IF NOT EXISTS FOR (g:Group) REQUIRE g.id IS UNIQUE",
            "CREATE CONSTRAINT expense_id_unique IF NOT EXISTS FOR (e:Expense) REQUIRE e.id IS UNIQUE",
            "CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email)",
        ]

        with self._driver.session() as session:
            for query in constraints:
                try:
                    session.run(query)
                except Exception as ex:
                    logger.debug(f"Constraint setup note: {ex}")

    def close(self):
        if self._driver:
            self._driver.close()
            self._is_connected = False
            logger.info("Closed Neo4j driver connection.")

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    def get_session(self):
        if not self._driver or not self._is_connected:
            return None
        return self._driver.session()


db = Neo4jConnection()
