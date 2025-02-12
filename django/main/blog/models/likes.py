from django.db import models
import uuid
from blog.models.articles import Articles

class Likes(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    blog_post = models.ForeignKey(Articles, on_delete=models.CASCADE, related_name='post_likes', verbose_name="記事ID")
    ip_address = models.CharField(max_length=15, verbose_name="IPアドレス") # 255.255.255.255
    session_id = models.CharField(max_length=255, verbose_name="セッションID")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")

    def __str__(self):
        return f"{self.blog_post}"

    class Meta:
        app_label = 'blog'
        
