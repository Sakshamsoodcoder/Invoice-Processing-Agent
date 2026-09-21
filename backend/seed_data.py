import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.user import User
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.invoice_issue import InvoiceIssue
from app.core.security import hash_password

def seed_database():
    print("Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        demo_email = "demo@invoiceai.com"
        user = db.query(User).filter(User.email == demo_email).first()
        if not user:
            print(f"Creating demo user ({demo_email})...")
            user = User(
                name="Alex Morgan",
                email=demo_email,
                password=hash_password("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Demo user created with ID: {user.id}")
        else:
            print(f"Demo user exists with ID: {user.id}")

        existing_count = db.query(Invoice).filter(Invoice.user_id == user.id).count()
        if existing_count >= 5:
            print(f"Database already populated with {existing_count} sample invoices.")
            return

        print("Seeding realistic sample invoices...")
        now = datetime.now(timezone.utc)

        sample_invoices = [
            {
                "invoice_number": "INV-2026-9042",
                "vendor_name": "Azure Enterprise Cloud Services",
                "vendor_address": "One Microsoft Way, Redmond, WA 98052, USA",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": (now - timedelta(days=5)).strftime("%Y-%m-%d"),
                "due_date": (now + timedelta(days=25)).strftime("%Y-%m-%d"),
                "subtotal": 1250.00,
                "tax": 125.00,
                "total": 1375.00,
                "currency": "USD",
                "payment_terms": "Net 30",
                "status": "Valid",
                "confidence": 0.98,
                "summary": "Monthly cloud infrastructure consumption covering Azure OpenAI GPT-4o, App Service, and Blob Storage. Calculations verified and within procurement budget.",
                "blob_url": "/api/invoices/files/sample-azure-cloud.pdf",
                "file_name": "azure_invoice_mar2026.pdf",
                "file_size": 248102,
                "content_type": "application/pdf",
                "is_mock": True,
                "created_at": now - timedelta(days=5),
                "items": [
                    {"description": "Azure App Service Premium V3 (P1v3)", "quantity": 2.0, "unit_price": 280.00, "amount": 560.00},
                    {"description": "Azure OpenAI GPT-4o Token Consumption", "quantity": 1.0, "unit_price": 440.00, "amount": 440.00},
                    {"description": "Azure Blob Storage Standard GRS (5TB)", "quantity": 5.0, "unit_price": 50.00, "amount": 250.00}
                ],
                "issues": []
            },
            {
                "invoice_number": "DELL-882109",
                "vendor_name": "Dell Technologies Global",
                "vendor_address": "1 Dell Way, Round Rock, TX 78682, USA",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": (now - timedelta(days=12)).strftime("%Y-%m-%d"),
                "due_date": (now + timedelta(days=18)).strftime("%Y-%m-%d"),
                "subtotal": 4200.00,
                "tax": 378.00,
                "total": 4578.00,
                "currency": "USD",
                "payment_terms": "Net 30",
                "status": "Valid",
                "confidence": 0.96,
                "summary": "Hardware acquisition for engineering team workstations. Unit prices and totals strictly match vendor master agreement.",
                "blob_url": "/api/invoices/files/sample-dell-hardware.pdf",
                "file_name": "dell_hardware_feb2026.pdf",
                "file_size": 395400,
                "content_type": "application/pdf",
                "is_mock": True,
                "created_at": now - timedelta(days=12),
                "items": [
                    {"description": "Dell XPS 15 Workstation 32GB RAM", "quantity": 2.0, "unit_price": 1850.00, "amount": 3700.00},
                    {"description": "Dell UltraSharp 27 4K Monitor", "quantity": 1.0, "unit_price": 500.00, "amount": 500.00}
                ],
                "issues": []
            },
            {
                "invoice_number": "TECH-4091",
                "vendor_name": "TechSupply Office Depot",
                "vendor_address": "800 K Street NW, Washington, DC 20001",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": (now - timedelta(days=8)).strftime("%Y-%m-%d"),
                "due_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
                "subtotal": 600.00,
                "tax": 50.00,
                "total": 720.00,  # Discrepancy: 600 + 50 != 720
                "currency": "USD",
                "payment_terms": "Net 15",
                "status": "Needs Review",
                "confidence": 0.81,
                "summary": "Invoice flagged for mathematical discrepancy. Subtotal ($600.00) + Tax ($50.00) equals $650.00, but stated Total is $720.00 (diff: $70.00). Requires revised invoice from vendor.",
                "blob_url": "/api/invoices/files/sample-techsupply.pdf",
                "file_name": "techsupply_office_supplies.pdf",
                "file_size": 185200,
                "content_type": "application/pdf",
                "is_mock": True,
                "created_at": now - timedelta(days=8),
                "items": [
                    {"description": "Ergonomic Mesh Office Chairs", "quantity": 3.0, "unit_price": 150.00, "amount": 450.00},
                    {"description": "USB-C Dual Display Docking Stations", "quantity": 1.0, "unit_price": 150.00, "amount": 150.00}
                ],
                "issues": [
                    {
                        "issue_type": "validation",
                        "severity": "high",
                        "description": "Mathematical Mismatch: Subtotal ($600.00) + Tax ($50.00) = $650.00, but extracted Total is $720.00 (diff: $70.00)"
                    },
                    {
                        "issue_type": "anomaly",
                        "severity": "medium",
                        "description": "Calculation Anomaly: Mathematical Mismatch between stated items and invoice total."
                    }
                ]
            },
            {
                "invoice_number": "AWS-009412",
                "vendor_name": "Amazon Web Services (AWS)",
                "vendor_address": "410 Terry Ave N, Seattle, WA 98109",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
                "due_date": (now + timedelta(days=10)).strftime("%Y-%m-%d"),
                "subtotal": 2890.50,
                "tax": 0.00,
                "total": 2890.50,
                "currency": "USD",
                "payment_terms": "Net 30",
                "status": "Valid",
                "confidence": 0.97,
                "summary": "Secondary failover cloud instances and S3 multi-region replication. Zero tax applied under interstate B2B enterprise tax exemption certificate.",
                "blob_url": "/api/invoices/files/sample-aws-failover.pdf",
                "file_name": "aws_services_jan2026.pdf",
                "file_size": 312040,
                "content_type": "application/pdf",
                "is_mock": True,
                "created_at": now - timedelta(days=20),
                "items": [
                    {"description": "Amazon EC2 Reserved Instances c6i.4xlarge", "quantity": 2.0, "unit_price": 950.00, "amount": 1900.00},
                    {"description": "Amazon Aurora PostgreSQL Provisioned I/O", "quantity": 1.0, "unit_price": 990.50, "amount": 990.50}
                ],
                "issues": []
            },
            {
                "invoice_number": "CRM-88120",
                "vendor_name": "Salesforce CRM Solutions",
                "vendor_address": "415 Mission St, San Francisco, CA 94105",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": (now - timedelta(days=25)).strftime("%Y-%m-%d"),
                "due_date": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
                "subtotal": 1800.00,
                "tax": 144.00,
                "total": 1944.00,
                "currency": "USD",
                "payment_terms": "Net 30",
                "status": "Valid",
                "confidence": 0.95,
                "summary": "Enterprise CRM user seats and Service Cloud licenses. Verified against annual contract terms.",
                "blob_url": "/api/invoices/files/sample-salesforce.pdf",
                "file_name": "salesforce_crm_seats.pdf",
                "file_size": 220100,
                "content_type": "application/pdf",
                "is_mock": True,
                "created_at": now - timedelta(days=25),
                "items": [
                    {"description": "Salesforce Sales Cloud Enterprise Edition", "quantity": 12.0, "unit_price": 150.00, "amount": 1800.00}
                ],
                "issues": []
            },
            {
                "invoice_number": "LOG-33019",
                "vendor_name": "Apex Logistics Corp",
                "vendor_address": "500 Harbor Blvd, Long Beach, CA 90802",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": (now - timedelta(days=2)).strftime("%Y-%m-%d"),
                "due_date": (now + timedelta(days=12)).strftime("%Y-%m-%d"),
                "subtotal": 920.00,
                "tax": 0.00,
                "total": 920.00,
                "currency": "USD",
                "payment_terms": "Due on Receipt",
                "status": "Needs Review",
                "confidence": 0.84,
                "summary": "Freight delivery invoice flagged: Zero tax on interstate delivery without documented exemption number, and line item description is generic.",
                "blob_url": "/api/invoices/files/sample-apex-logistics.pdf",
                "file_name": "apex_freight_manifest.pdf",
                "file_size": 174000,
                "content_type": "application/pdf",
                "is_mock": True,
                "created_at": now - timedelta(days=2),
                "items": [
                    {"description": "Expedited Pallet Logistics & Drayage", "quantity": 1.0, "unit_price": 920.00, "amount": 920.00}
                ],
                "issues": [
                    {
                        "issue_type": "anomaly",
                        "severity": "low",
                        "description": "Notice: Zero tax recorded on an invoice exceeding standard exemption thresholds. Please confirm tax exemption status."
                    }
                ]
            }
        ]

        for inv_data in sample_invoices:
            items_data = inv_data.pop("items")
            issues_data = inv_data.pop("issues")

            inv = Invoice(user_id=user.id, **inv_data)
            db.add(inv)
            db.commit()
            db.refresh(inv)

            for item in items_data:
                db.add(InvoiceItem(invoice_id=inv.id, **item))

            for issue in issues_data:
                db.add(InvoiceIssue(invoice_id=inv.id, **issue))

            db.commit()

        print("Seeding completed successfully! 6 realistic invoices added.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
