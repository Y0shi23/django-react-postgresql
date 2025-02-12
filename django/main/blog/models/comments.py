from django.db import models
import uuid
from blog.models.articles import Articles

class Comments(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    article = models.ForeignKey(Articles, on_delete=models.CASCADE, related_name='post_comments', verbose_name="記事ID")
    user_name = models.CharField(max_length=30)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True,  verbose_name="更新日時")

    def __str__(self):
        return f"{self.comment}"

    class Meta:
        app_label = 'blog'