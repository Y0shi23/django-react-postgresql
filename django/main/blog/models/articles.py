from django.db import models
import uuid

# articlesテーブル
class Articles(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    title = models.CharField(max_length=255)
    context = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")

    def __str__(self):
        return self.title

    class Meta:
        app_label = 'blog'