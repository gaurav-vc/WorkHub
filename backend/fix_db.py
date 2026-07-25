import sqlite3

def fix_db():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE role_base_access_role ADD COLUMN permissions json DEFAULT '{}'")
        print("Successfully added 'permissions' column to role_base_access_role.")
    except sqlite3.OperationalError as e:
        print(f"Error (might already exist): {e}")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_db()
