from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token

from vocabulary.views.api.RegisterView import RegisterView

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

app_name = "vocabulary"

urlpatterns = [
    # path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/vocabulary/register/', RegisterView.as_view(), name='register'),
    #path('api/vocabulary/auth/', include('djoser.urls')),  
]
