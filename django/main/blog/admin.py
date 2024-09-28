from django.contrib import admin
# from django.contrib.admin.sites import AdminSite
# from django.conf import settings
from django.templatetags.static import static

from blog.models import Category_Master, Articles, Post_Articles, Comments

class PostArticlesInline(admin.TabularInline):
    model = Post_Articles
    extra = 0  # ウィジェットの追加行数を指定

@admin.register(Articles)
class PostArticlesAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]
#    inlines = [PostArticlesInline]

@admin.register(Post_Articles)
class PostArticlesAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]
#    inlines = [PostArticlesInline]

@admin.register(Category_Master)
class CategoryMasterAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]

@admin.register(Comments)
class CategoryMasterAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]

