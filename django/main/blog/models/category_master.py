from django.db import models
import uuid

# category_masterテーブル
class Category_Master(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    category_name = models.CharField(max_length=15, verbose_name="カテゴリー名")
    page_date = models.DateTimeField(auto_now_add=True, verbose_name="日付")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")

    def __str__(self):
        return self.category_name

    class Meta:
        app_label = 'blog'