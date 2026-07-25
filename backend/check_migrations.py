import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.db.migrations.executor import MigrationExecutor

executor = MigrationExecutor(connection)
targets = executor.loader.graph.leaf_nodes()
unapplied_migrations = [str(m) for m in executor.migration_plan(targets)]

print("Unapplied Migrations:")
for m in unapplied_migrations:
    print(m)
