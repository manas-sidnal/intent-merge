def validate_user(user_id):
    print(f"Validating {user_id}")
    return True

def process_payment(amount, user_id):
    print(f"Processing {amount} for {user_id}")
    return {"status": "success", "amount": amount}

def calculate_tax(amount):
    return amount * 0.12
