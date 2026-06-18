from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, CustomTokenObtainPairView, RoleViewSet,
    ForgotPasswordRequestView, VerifyOTPView, ResetPasswordView,
    PendingUsersView, ApproveUserView,
    EmployeeDepartmentView, AssignDepartmentView, RemoveFromDepartmentView,
    CreateActiveUserView, CreateAdminView, OrganizationViewSet, AssignManagerView,
    get_leaderboard
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'organizations', OrganizationViewSet, basename='organizations')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordRequestView.as_view(), name='forgot-password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('pending-users/', PendingUsersView.as_view(), name='pending-users'),
    path('approve-user/<int:user_id>/', ApproveUserView.as_view(), name='approve-user'),
    path('employees/', EmployeeDepartmentView.as_view(), name='employees'),
    path('assign-department/', AssignDepartmentView.as_view(), name='assign-department'),
    path('assign-manager/', AssignManagerView.as_view(), name='assign-manager'),
    path('remove-department/<int:user_id>/', RemoveFromDepartmentView.as_view(), name='remove-department'),
    path('create-user/', CreateActiveUserView.as_view(), name='create-user'),
    path('create-admin/', CreateAdminView.as_view(), name='create-admin'),
    path('leaderboard/', get_leaderboard, name='leaderboard'),
    path('', include(router.urls)),
]
