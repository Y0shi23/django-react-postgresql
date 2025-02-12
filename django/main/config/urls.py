from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/', include('blog.urls')),  # blogのURLパターンを'api/'の下に配置
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/vocabulary/', include('vocabulary.urls')),  # vocabularyのURLパターン
] 