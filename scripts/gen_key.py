"""Generate a Fernet key for SECRETS_ENCRYPTION_KEY (never commit the output)."""
from cryptography.fernet import Fernet

print(Fernet.generate_key().decode())
