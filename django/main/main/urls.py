# main/urls.py
from django.contrib import admin
# from django.contrib.auth import views
from django.urls import path, include
# blog.viewsのindexを直接インポート
from blog.viewses import index
from blog.views.api import ArticlesView, ArticlesViewAll, LikePost, PostCommentView
from vocabulary.views.api.RegisterView import RegisterView

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('blog/', include('blog.urls')),  # blogアプリのURL設定をインクルード
    path('api/blog/', ArticlesViewAll.as_view(), name='article_detail'),
    path('api/blog/', include('blog.urls')),  # ブログ関連APIはここにまとめる
    # path('api/blog/<uuid:pk>', ArticlesView.as_view(), name='article_detail'),
    # path('api/blog/<uuid:post_id>/like/', LikePost.as_view(), name='article_detail'),
    # path('api/blog/<uuid:post_id>/comment/', PostCommentView.as_view(), name='article_detail'),
    # path('detail/<uuid:pk>/', views.article_detail, name='article_detail'),  # 記事詳細ビューを直接指定
    path('', index, name='index'),  # インデックスページを指定
    # path('api/vocabulary/auth/register/', register_user, name='register_user'),
    # path('api/vocabulary/auth/', include('djoser.urls')),
    # path('api/vocabulary/auth/', include('djoser.urls.authtoken')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # path('api/vocabulary/register/', RegisterView.as_view(), name='register_user'),
    # vocabularyアプリのURL設定をインクルード
    path('api/vocabulary/', include('vocabulary.urls')),
]