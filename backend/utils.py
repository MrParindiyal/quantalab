from pwdlib import PasswordHash

hasher = PasswordHash.recommended()


def hash_password(password):
    return hasher.hash(password)


def check_password(password, hashed):
    return hasher.verify(password, hashed)
