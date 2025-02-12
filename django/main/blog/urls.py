# blog/urls.py
from django.urls import path
from blog.viewses import index
from blog.views.api.articles_view import ArticlesView
from blog.views.api.articles_viewall import ArticlesViewAll
from blog.views.api import LikePost, PostCommentView

app_name = "blog"

urlpatterns = [
    path('', index, name="index"),  # インデックスページ
    # path('api/blog/', ArticlesViewAll.as_view(), name='article_list'),
    path('<uuid:pk>/', ArticlesView.as_view(), name='article_detail'),
    path('<uuid:post_id>/like/', LikePost.as_view(), name='article_like'),
    path('<uuid:post_id>/comment/', PostCommentView.as_view(), name='article_comment'),
]
