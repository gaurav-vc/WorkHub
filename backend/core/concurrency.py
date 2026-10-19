import time
import random
import logging
import threading
import sqlite3
from functools import wraps

from django.db import OperationalError, DatabaseError
from django.db.backends.signals import connection_created
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# In-process reentrant lock to serialize write operations when using SQLite.
# This prevents thread contention inside the same ASGI/WSGI process from
# causing SQLite read-then-write deadlocks and file-lock collisions.
_sqlite_write_lock = threading.RLock()


@receiver(connection_created)
def configure_sqlite_connection(sender, connection, **kwargs):
    """
    Automatically configures every SQLite database connection with:
    - WAL mode (Write-Ahead Logging): Allows simultaneous readers and writer.
    - busy_timeout=60000: SQLite C-layer waits up to 60s for locks to clear.
    - synchronous=NORMAL: Safe in WAL mode, cuts fsync disk lock wait by >90%.
    - cache_size=-64000: 64MB RAM page cache for lightning-fast queries.
    - temp_store=MEMORY: Temporary tables and indices stored in RAM.
    - mmap_size=268435456: 256MB memory-mapped I/O.
    """
    if connection.vendor == 'sqlite':
        try:
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA busy_timeout=60000;")
                cursor.execute("PRAGMA synchronous=NORMAL;")
                cursor.execute("PRAGMA cache_size=-64000;")
                cursor.execute("PRAGMA temp_store=MEMORY;")
                try:
                    cursor.execute("PRAGMA mmap_size=268435456;")
                except Exception:
                    pass
        except Exception as e:
            logger.warning("Could not set SQLite PRAGMAs: %s", e)


def is_lock_error(exc):
    """
    Determines if an exception is due to SQLite / DB lock contention or deadlock.
    """
    if isinstance(exc, (OperationalError, DatabaseError, sqlite3.OperationalError)):
        msg = str(exc).lower()
        lock_keywords = [
            'database is locked',
            'database table is locked',
            'locked',
            'busy',
            'deadlock',
            'cannot start a transaction within a transaction',
            'table is locked'
        ]
        return any(kw in msg for kw in lock_keywords)
    return False


def robust_db_write(fn, *args, max_retries=12, initial_delay=0.03, max_delay=0.4, **kwargs):
    """
    Executes a callable with guaranteed concurrency protection and exponential
    jittered backoff.
    
    If SQLite is used:
    1. Uses an in-process reentrant lock (_sqlite_write_lock) so concurrent threads
       in the same worker serialize writes smoothly without file collisions.
    2. Catches any OperationalError (database is locked / busy) and retries with
       randomized exponential backoff up to `max_retries` times.
    3. Closes stale connection handles between retries so dead transaction locks
       are released cleanly.
    """
    from django.db import connection
    is_sqlite = connection.vendor == 'sqlite'

    def _exec_with_retry():
        last_exc = None
        for attempt in range(max_retries):
            try:
                return fn(*args, **kwargs)
            except Exception as exc:
                if is_lock_error(exc):
                    last_exc = exc
                    # Close stale connection to reset transaction state
                    try:
                        connection.close()
                    except Exception:
                        pass
                    
                    if attempt < max_retries - 1:
                        # Exponential backoff with random jitter: (e.g. 30ms -> 50ms -> 80ms ...)
                        delay = min(max_delay, initial_delay * (1.5 ** attempt))
                        jitter = random.uniform(0.01, 0.05)
                        total_sleep = delay + jitter
                        logger.warning(
                            "Database lock detected on attempt %d/%d. Retrying in %.3fs... (%s)",
                            attempt + 1, max_retries, total_sleep, exc
                        )
                        time.sleep(total_sleep)
                        continue
                raise exc
        if last_exc:
            raise last_exc

    if is_sqlite:
        with _sqlite_write_lock:
            return _exec_with_retry()
    else:
        return _exec_with_retry()


def concurrency_retry(max_retries=12, initial_delay=0.03, max_delay=0.4):
    """
    Decorator for functions or methods that perform database writes and need
    high-concurrency resilience.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return robust_db_write(
                func, *args,
                max_retries=max_retries,
                initial_delay=initial_delay,
                max_delay=max_delay,
                **kwargs
            )
        return wrapper
    return decorator
