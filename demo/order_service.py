"""
Order Service - Core business logic
"""

def validate_user(user_id):
    print(f"Validating user {user_id}")
    return True

def process_payment(amount, user_id):
    print(f"Processing payment of {amount} for user {user_id}")
    return {"status": "success", "amount": amount}

def calculate_tax(amount):
    return amount * 0.12
