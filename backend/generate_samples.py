import os

def create_sample_pdf(filepath, title, inv_num, vendor, items, subtotal, tax, total):
    """
    Creates a valid, clean PDF document using standard PDF stream format.
    Ensures PDF viewers and pypdf can read text without external dependencies.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    text_lines = [
        f"INVOICE: {inv_num}",
        f"VENDOR: {vendor}",
        f"TITLE: {title}",
        f"DATE: 2026-03-01",
        f"DUE DATE: 2026-03-31",
        "--------------------------------------------------",
        "LINE ITEMS:"
    ]
    for item in items:
        text_lines.append(f"- {item['desc']} | Qty: {item['qty']} | Price: ${item['price']:.2f} | Amt: ${item['amt']:.2f}")
    
    text_lines.extend([
        "--------------------------------------------------",
        f"SUBTOTAL: ${subtotal:.2f}",
        f"TAX: ${tax:.2f}",
        f"TOTAL AMOUNT: ${total:.2f}",
        "PAYMENT TERMS: Net 30",
        "THANK YOU FOR YOUR BUSINESS!"
    ])

    # Simple standard PDF generator
    content_stream = "BT\n/F1 12 Tf\n50 750 Td\n18 TL\n"
    for line in text_lines:
        safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_stream += f"({safe_line}) '\n"
    content_stream += "ET"

    stream_len = len(content_stream.encode("latin-1"))

    pdf_template = (
        "%PDF-1.4\n"
        "1 0 obj\n"
        "<< /Type /Catalog /Pages 2 0 R >>\n"
        "endobj\n"
        "2 0 obj\n"
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n"
        "endobj\n"
        "3 0 obj\n"
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n"
        "endobj\n"
        "4 0 obj\n"
        f"<< /Length {stream_len} >>\n"
        "stream\n"
        f"{content_stream}\n"
        "endstream\n"
        "endobj\n"
        "5 0 obj\n"
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n"
        "endobj\n"
        "xref\n"
        "0 6\n"
        "0000000000 65535 f \n"
        "0000000010 00000 n \n"
        "0000000060 00000 n \n"
        "0000000117 00000 n \n"
        f"{str(len('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n')).zfill(10)} 00000 n \n"
        "trailer\n"
        "<< /Size 6 /Root 1 0 R >>\n"
        "startxref\n"
        "500\n"
        "%%EOF\n"
    )

    with open(filepath, "wb") as f:
        f.write(pdf_template.encode("latin-1"))
    print(f"Generated sample PDF: {filepath}")

def generate_all_samples():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_invoices"))
    os.makedirs(base_dir, exist_ok=True)

    # 1. Azure Cloud Services
    create_sample_pdf(
        os.path.join(base_dir, "sample_azure_cloud.pdf"),
        title="Azure Cloud Services March Invoice",
        inv_num="INV-2026-9042",
        vendor="Azure Enterprise Cloud Services",
        items=[
            {"desc": "Azure App Service Premium V3", "qty": 2.0, "price": 280.00, "amt": 560.00},
            {"desc": "Azure OpenAI GPT-4o Token Consumption", "qty": 1.0, "price": 440.00, "amt": 440.00},
            {"desc": "Azure Blob Storage Standard GRS (5TB)", "qty": 5.0, "price": 50.00, "amt": 250.00}
        ],
        subtotal=1250.00,
        tax=125.00,
        total=1375.00
    )

    # 2. Dell Technologies
    create_sample_pdf(
        os.path.join(base_dir, "sample_dell_hardware.pdf"),
        title="Hardware Workstation Procurement",
        inv_num="DELL-882109",
        vendor="Dell Technologies Global",
        items=[
            {"desc": "Dell XPS 15 Workstation 32GB RAM", "qty": 2.0, "price": 1850.00, "amt": 3700.00},
            {"desc": "Dell UltraSharp 27 4K Monitor", "qty": 1.0, "price": 500.00, "amt": 500.00}
        ],
        subtotal=4200.00,
        tax=378.00,
        total=4578.00
    )

    # 3. Discrepancy Invoice (Math Error)
    create_sample_pdf(
        os.path.join(base_dir, "sample_math_error.pdf"),
        title="Office Equipment & Supplies",
        inv_num="TECH-4091",
        vendor="TechSupply Office Depot",
        items=[
            {"desc": "Ergonomic Mesh Office Chairs", "qty": 3.0, "price": 150.00, "amt": 450.00},
            {"desc": "USB-C Dual Display Docking Stations", "qty": 1.0, "price": 150.00, "amt": 150.00}
        ],
        subtotal=600.00,
        tax=50.00,
        total=720.00 # Mismatch!
    )

    print("All sample invoices generated successfully.")

if __name__ == "__main__":
    generate_all_samples()
