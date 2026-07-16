import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'db.sqlite3')
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Set the birthday to July 18 (2 days from now)
    cursor.execute("UPDATE directory_employee SET date_of_birth='1995-07-18' WHERE name='Gaurav Kokane'")
    conn.commit()
    print("Successfully updated Gaurav Kokane's date of birth to July 18!")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
