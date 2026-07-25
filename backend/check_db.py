import sqlite3

def check_db():
    conn = sqlite3.connect('db.sqlite3')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(boards_card)")
    cols = cursor.fetchall()
    print("boards_card columns:", [c[1] for c in cols])
    
    cursor.execute("PRAGMA table_info(role_base_access_role)")
    cols = cursor.fetchall()
    print("role_base_access_role columns:", [c[1] for c in cols])
    
    conn.close()

if __name__ == "__main__":
    check_db()
