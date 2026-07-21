import os
import django
from django.core.management import call_command
from io import StringIO
from django.db import connection

# Ensure Django settings are loaded
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def reset_all_sequences():
    from django.apps import apps
    from django.core.management.color import no_style
    
    print("Generating sequence reset SQL using Django internals...")
    style = no_style()
    statements = []
    
    # Get all models from all apps
    for app_config in apps.get_app_configs():
        models = list(app_config.get_models())
        if models:
            # Generate the sequence reset statements for this app's models
            app_statements = connection.ops.sequence_reset_sql(style, models)
            statements.extend(app_statements)
            
    if not statements:
        print("No sequences to reset.")
        return
        
    print(f"Generated {len(statements)} SQL statements. Executing against live database...")
    
    with connection.cursor() as cursor:
        for stmt in statements:
            cursor.execute(stmt)
        
    print("✅ Sequences reset successfully! Auto-increment IDs are now synced.")

if __name__ == '__main__':
    reset_all_sequences()
