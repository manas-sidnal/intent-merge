"""
Order Service - Core business logic
"""

def validate_user(user_id):
    # Payments team: user must exist for payment
    if not user_id:
        raise ValueError("User ID required for payment")
    return True

def process_payment(amount, user_id):
    if amount <= 0:
        raise ValueError("Amount must be positive")
    tax = calculate_tax(amount)
    total = amount + tax
    print(f"Processing {total:.2f} for {user_id}")
    return {"status": "success", "amount": amount, "tax": tax, "total": total}


def calculate_tax(amount):
    return amount * 0.08
