from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

class CaseInsensitiveModelBackend(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL with case-insensitive username or email,
    while strictly preserving password case-sensitivity.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        if not username or password is None:
            return None

        clean_username = str(username).strip()
        try:
            user = UserModel.objects.filter(
                Q(**{f"{UserModel.USERNAME_FIELD}__iexact": clean_username}) |
                Q(email__iexact=clean_username)
            ).first()
            if not user:
                # Run the default password hasher once to reduce timing attacks
                UserModel().set_password(password)
                return None
        except Exception:
            return None

        # Verify password case-sensitively
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
