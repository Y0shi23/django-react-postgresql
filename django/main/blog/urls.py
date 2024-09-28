# blog/urls.py
from django.urls import path
from blog.views import index, article_detail, articles_all

app_name = "blog"

urlpatterns = [
    path('', index, name="index"),  # インデックスページ
    path('api/blog/', articles_all, name='Api'),
    path('api/blog/<uuid:pk>/', article_detail, name='Api'),
    # path('detail/<uuid:pk>/', article_detail, name='article_detail'),  # 記事詳細ページ
]
