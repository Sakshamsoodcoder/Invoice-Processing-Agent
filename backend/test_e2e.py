import urllib.request
import json
import os

def test_e2e():
    print("--- Testing InvoiceAI E2E Workflow ---")
    
    # 1. Login
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'email': 'demo@invoiceai.com', 'password': 'Password123!'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        login_res = json.loads(res.read())
    
    token = login_res['access_token']
    print(f"1. Login OK: {login_res['user']['name']} ({login_res['user']['email']})")

    # 2. Get Analytics
    anal_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/analytics/summary',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(anal_req) as res:
        anal_res = json.loads(res.read())
    
    print(f"2. Analytics OK: {anal_res['total_invoices']} invoices, "
          f"${anal_res['total_amount']:,.2f} total, "
          f"{anal_res['valid_invoices']} valid, {anal_res['needs_review_invoices']} review needed.")

    # 3. List Invoices
    inv_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/invoices?page=1&page_size=5',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(inv_req) as res:
        inv_res = json.loads(res.read())
    
    print(f"3. Invoices List OK: retrieved {len(inv_res['invoices'])} of {inv_res['total']} invoices.")
    for inv in inv_res['invoices']:
        print(f"   • [{inv['status']}] {inv['invoice_number']} from {inv['vendor_name']} (${inv['total']:,.2f})")

    # 4. Detail of First Invoice
    first_id = inv_res['invoices'][0]['id']
    detail_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/invoices/{first_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(detail_req) as res:
        detail_res = json.loads(res.read())
    print(f"4. Invoice Detail OK: ID {first_id} has {len(detail_res['items'])} line items and {len(detail_res['issues'])} issues.")

    print("\n--- ALL E2E API VERIFICATIONS PASSED SUCCESSFULLY! ---")

if __name__ == '__main__':
    test_e2e()
