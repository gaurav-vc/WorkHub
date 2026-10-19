from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.views import exception_handler as drf_default_exception_handler


def custom_exception_handler(exc, context):
    """
    Translates uncaught Django model ValidationErrors into standard DRF 400 ValidationErrors.
    Preserves exact byte-for-byte behavior for all other exceptions by delegating to DRF's handler.
    """
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'error_dict'):
            detail = exc.message_dict
        else:
            detail = exc.messages
        exc = DRFValidationError(detail=detail)

    return drf_default_exception_handler(exc, context)
