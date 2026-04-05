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


def main():
    """Main function to set up the database"""
    try:
        # Connect to database
        conn = get_db_connection()

        # Path to schema.sql file
        backend_dir = Path(__file__).parent
        schema_file = backend_dir / "schema.sql"

        # Check if schema file exists
        if not schema_file.exists():
            print(f"✗ Schema file not found: {schema_file}")
            raise FileNotFoundError("schema.sql file is missing")

        print(f"\nSetting up PantryPal database...")

        # Execute the schema file
        execute_sql_file(conn, schema_file)

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
