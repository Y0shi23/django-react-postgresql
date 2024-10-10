"""
URL configuration for main project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# main/urls.py
from django.contrib import admin
from django.urls import path, include
# blog.viewsのindexを直接インポート
from blog.viewses import index
from blog.views.api import ArticlesView, ArticlesViewAll, LikePost, PostCommentView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('blog/', include('blog.urls')),  # blogアプリのURL設定をインクルード
    path('api/blog/', ArticlesViewAll.as_view(), name='article_detail'),
    path('api/blog/<uuid:pk>', ArticlesView.as_view(), name='article_detail'),
    path('api/blog/<uuid:post_id>/like/', LikePost.as_view(), name='article_detail'),
    path('api/blog/<uuid:post_id>/comment/', PostCommentView.as_view(), name='article_detail'),
    # path('detail/<uuid:pk>/', views.article_detail, name='article_detail'),  # 記事詳細ビューを直接指定
    path('', index, name='index'),  # インデックスページを指定
]