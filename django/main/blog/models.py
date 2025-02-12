#from django.db import models
#import uuid#

## category_masterテーブル
#class Category_Master(models.Model):
#    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
#    category_name = models.CharField(max_length=15, verbose_name="カテゴリー名")
#    page_date = models.DateTimeField(auto_now_add=True, verbose_name="日付")
#    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
#    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")#

#    def __str__(self):
#        return self.category_name#

## articlesテーブル
#class Articles(models.Model):
#    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
#    title = models.CharField(max_length=255)
#    context = models.TextField()
#    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
#    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")#

#    def __str__(self):
#        return self.title#

#class Post_Articles(models.Model):
#    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
#    article = models.ForeignKey(Articles, on_delete=models.CASCADE, related_name='post_articles', verbose_name="記事ID")
#    category = models.ForeignKey(Category_Master, on_delete=models.CASCADE, related_name='post_articles', verbose_name="カテゴリーID")
#    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
#    updated_at = models.DateTimeField(blank=True, null=True,  verbose_name="更新日時") 
#    
#    def __str__(self):
#        return f"{self.article}"#

#class Comment(models.Model):
#    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
#    article = models.ForeignKey(Articles, on_delete=models.CASCADE, related_name='post_comments', verbose_name="記事ID")
#    user_name = models.CharField(max_length=30)
#    comment = models.TextField()
#    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
#    updated_at = models.DateTimeField(blank=True, null=True,  verbose_name="更新日時")#

#    def __str__(self):
#        return f"{self.comment}"#

#class Likes(models.Model):
#    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
#    blog_post = models.ForeignKey(Articles, on_delete=models.CASCADE, related_name='post_likes', verbose_name="記事ID")
#    ip_address = models.CharField(max_length=15, verbose_name="IPアドレス")
#    session_id = models.CharField(max_length=255, verbose_name="セッションID")
#    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")#

#    def __str__(self):
#        return f"{self.blog_post}"
