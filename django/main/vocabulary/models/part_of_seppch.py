from django.db import models
import uuid

# 品詞モデル
class PartOfSpeech(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    name = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True, verbose_name="説明")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")

    def __str__(self):
        return self.name