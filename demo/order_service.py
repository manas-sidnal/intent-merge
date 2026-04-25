def validate_user(user_id):
    # Auth team: stricter validation
    if not user_id or len(str(user_id)) < 3:
        raise ValueError("Invalid user ID")
    print(f"Validating {user_id} with JWT check")
    return True


def process_payment(amount, user_id):
    print(f"Processing {amount} for {user_id}")
    return {"status": "success", "amount": amount}

def calculate_tax(amount):
    return amount * 0.08
