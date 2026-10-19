from django.apps import AppConfig


class ProjectConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'Project'

    def ready(self):
        import Project.signals
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                if connection.vendor == 'sqlite':
                    cursor.execute("PRAGMA table_info(api_task)")
                    columns = [col[1] for col in cursor.fetchall()]
                    if columns and 'is_urgent' not in columns:
                        cursor.execute("ALTER TABLE api_task ADD COLUMN is_urgent BOOLEAN DEFAULT 0")
                elif connection.vendor == 'postgresql':
                    cursor.execute("ALTER TABLE api_task ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE")
                elif connection.vendor == 'mysql':
                    cursor.execute("SHOW COLUMNS FROM api_task LIKE 'is_urgent'")
                    if not cursor.fetchone():
                        cursor.execute("ALTER TABLE api_task ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE")
        except Exception as e:
            pass
