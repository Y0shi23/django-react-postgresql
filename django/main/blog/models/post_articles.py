from django.db import models
import uuid
from blog.models.articles import Articles
from blog.models.category_master import Category_Master

class Post_Articles(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    article = models.ForeignKey(Articles, on_delete=models.CASCADE, related_name='post_articles', verbose_name="記事ID")
    category = models.ForeignKey(Category_Master, on_delete=models.CASCADE, related_name='post_articles', verbose_name="カテゴリーID")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True,  verbose_name="更新日時") 
    
    def __str__(self):
        return f"{self.article}"

    class Meta:
        app_label = 'blog'