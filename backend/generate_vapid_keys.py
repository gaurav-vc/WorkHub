from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

def b64urlencode(data):
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()

priv_raw = private_key.private_numbers().private_value.to_bytes(32, 'big')
pub_raw = public_key.public_bytes(
    serialization.Encoding.X962, 
    serialization.PublicFormat.UncompressedPoint
)

print("\n--- VAPID KEYS GENERATED ---")
print(f"VAPID_PRIVATE_KEY={b64urlencode(priv_raw)}")
print(f"VITE_VAPID_PUBLIC_KEY={b64urlencode(pub_raw)}")
print("----------------------------\n")
