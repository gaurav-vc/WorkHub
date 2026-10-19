import os
from pathlib import Path

# Load environment variables from .env file (if present)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env', override=True)
except ImportError:
    pass  # python-dotenv not installed; rely on system environment variables

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-c&7j*58ngon#s44&#y^5jj60z=v--#(!-*kn+hw*jl5ic2)3ea'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    'workhub.vibesandbox.live',
    'workhub.vibecopilot.ai',
    '103.192.198.102',
    'localhost',
    '127.0.0.1',
    'testserver',
]

CSRF_TRUSTED_ORIGINS = [
    'https://workhub.vibesandbox.live',
    'https://workhub.vibecopilot.ai',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]


# Application definition

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'channels',
    
    'api',
    'django_filters',
    'templatesapp.apps.TemplatesappConfig',
    'authentication',
    'organization',
    'workspace',
    'MyDay',
    'timeline',
    'resources',
    'calendar_meeting',
    'role_base_access',
    'Project',
    'docs',
    'knowledge_base',
    'boards',
    'chat',
    'hr_requests',
    'policies',
    'directory',
    'recognition',
    'workflows',
    'integrations',
    'admin_settings',
    'branding',
    'insights',
    'ai_agents',
    'mom',
    'rest_framework_simplejwt',
    'learning_center',
    'core',
    'apps.bulk_tasks',
]

# Feature flag for Bulk Task Update V2 (Default: False)
ENABLE_BULK_TASK_UPDATE_V2 = False


ASGI_APPLICATION = 'core.asgi.application'
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.TenantMiddleware',
    'role_base_access.middleware.RBACEnforcementMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware', # Disabled to allow iframe previews on frontend
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

import os

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'timeout': 60,
        },
    }
}

# Load SQLite concurrency optimizations and connection PRAGMA listeners
import core.concurrency


AUTHENTICATION_BACKENDS = [
    'authentication.backends.CaseInsensitiveModelBackend',
    'django.contrib.auth.backends.ModelBackend',
]


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/api/static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
CORS_ALLOW_ALL_ORIGINS = True
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-module-id',
]

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', # Change to IsAuthenticated later for production
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend'
    ],
    'EXCEPTION_HANDLER': 'Project.exception_handlers.custom_exception_handler',
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': "",
    'AUDIENCE': None,
    'ISSUER': None,
    'JSON_ENCODER': None,
    'JWK_URL': None,
    'LEEWAY': 0,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    # 'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',

    'JTI_CLAIM': 'jti',
}

# Email Settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
EMAIL_HOST_USER = 'Konnect@envisageideas.com'
EMAIL_HOST_PASSWORD = 'atyp awcg zdfn ldov'
DEFAULT_FROM_EMAIL = f'WorkHub <{EMAIL_HOST_USER}>'

# Frontend URL (used in emails)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://workhub.vibecopilot.ai/')

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Azure OAuth
AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID', '')
AZURE_CLIENT_SECRET = os.environ.get('AZURE_CLIENT_SECRET', '')

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
# App-level refresh token for generating Google Meet links without user OAuth
GOOGLE_ADMIN_REFRESH_TOKEN = os.environ.get('GOOGLE_ADMIN_REFRESH_TOKEN', '')

# Azure / Microsoft OAuth
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID', '')


# Max upload limits for 20MB file support
DATA_UPLOAD_MAX_MEMORY_SIZE = 20971520
FILE_UPLOAD_MAX_MEMORY_SIZE = 20971520

# Allow iframe previews on frontend
X_FRAME_OPTIONS = 'ALLOWALL'

# Push Notifications
import json
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
vapid_claims_raw = os.environ.get('VAPID_CLAIMS', '{"sub": "mailto:admin@example.com"}')
try:
    VAPID_CLAIMS = json.loads(vapid_claims_raw)
except Exception:
    VAPID_CLAIMS = {"sub": "mailto:admin@example.com"}
