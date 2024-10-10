# blog/urls.py
from django.urls import path
from blog.viewses import index
from blog.views.api import ArticlesView, ArticlesViewAll, LikePost, PostCommentView

app_name = "blog"

urlpatterns = [
    path('', index, name="index"),  # インデックスページ
    path('api/blog/', ArticlesViewAll.as_view(), name='Api'),
    path('api/blog/<uuid:pk>/', ArticlesView.as_view(), name='Api'),
    # 記事詳細ページ
    # path('detail/<uuid:pk>/', article_detail, name='article_detail'),
    path('api/blog/<uuid:post_id>/like/', LikePost.as_view(), name='Api'),
    # コメント投稿
    path('api/blog/<uuid:post_id>/comment/', PostCommentView.as_view(), name='Api'),
]
