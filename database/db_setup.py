"""
Database Setup Script for PantryPal
Connects to Supabase PostgreSQL and executes the schema file
"""

import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file in parent directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def get_db_connection():
    """Create and return a database connection using the connection string"""
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError("DATABASE_URL not found in .env file")

    print("Connecting to Supabase database...")
    conn = psycopg2.connect(database_url)
    print("✓ Connected successfully!")
    return conn


def execute_sql_file(conn, sql_file_path):
    """Execute SQL commands from a file"""
    print(f"\nExecuting SQL file: {sql_file_path}")

    # Read the SQL file
    with open(sql_file_path, "r", encoding="utf-8") as file:
        sql_content = file.read()

    # Execute the SQL
    cursor = conn.cursor()
    try:
        cursor.execute(sql_content)
        conn.commit()
        print(f"✓ Successfully executed {sql_file_path}")

        # Get row count for verification
        cursor.execute("SELECT COUNT(*) FROM app_users")
        user_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM ingredients")
        ingredient_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM recipes")
        recipe_count = cursor.fetchone()[0]

        print(f"\n✓ Database populated with:")
        print(f"  - {user_count} users")
        print(f"  - {ingredient_count} ingredients")
        print(f"  - {recipe_count} recipes")

    except Exception as e:
        conn.rollback()
        print(f"✗ Error executing {sql_file_path}: {e}")
        raise
    finally:
        cursor.close()


def get_sql_files_in_order(sql_dir):
    """Return all .sql files in execution order: schema.sql first, then others alphabetically."""
    sql_files = sorted(sql_dir.glob("*.sql"), key=lambda p: p.name.lower())

    if not sql_files:
        return []

    schema_first = [p for p in sql_files if p.name.lower() == "schema.sql"]
    rest = [p for p in sql_files if p.name.lower() != "schema.sql"]
    return schema_first + rest


def main():
    """Main function to set up the database"""
    try:
        # Connect to database
        conn = get_db_connection()

        # Discover SQL files in this directory
        sql_dir = Path(__file__).parent
        sql_files = get_sql_files_in_order(sql_dir)

        if not sql_files:
            print(f"✗ No .sql files found in: {sql_dir}")
            raise FileNotFoundError("No SQL files found")

        print(f"\nSetting up PantryPal database...")

        print("\nSQL execution order:")
        for sql_file in sql_files:
            print(f"  - {sql_file.name}")

        # Execute all SQL files in order
        for sql_file in sql_files:
            execute_sql_file(conn, sql_file)

        # Close connection
        conn.close()
        print("\n✓ Database setup completed successfully!")
        print("\nYou can now run: python main.py")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
