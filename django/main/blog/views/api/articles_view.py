from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.views import View

from collections import OrderedDict

from blog.models import Articles, Comments, Post_Articles
import json
import markdown

class ArticlesView(View):
    # 記事詳細のビュー
    def get(self, request, pk):
        print(f"Debug: Accessing article with pk={pk}")
        # IDフィールド（UUIDフィールド）で検索
        # markdown拡張機能
        extensions_list = ['abbr', 'attr_list', 'def_list', 'fenced_code', 'footnotes', 'tables',]
        article = get_object_or_404(Articles, id=pk)
        
        try:
            # MarkdownをHTMLに変換
            article_content = markdown.markdown(article.context, extensions=extensions_list)
        except Exception as e:
            # エラーが発生した場合の処理
            return HttpResponse(f"Markdown変換エラー: {e}", status=500)
        
        # カテゴリー情報を取得
        categories = [
            post_article.category.category_name 
            for post_article in article.post_articles.all()
        ]
        
        # Commentsのコメント情報を最適化
        comments = Comments.objects.filter(article=article)
        comments_data = [
            {
                'user_name': comment.user_name,
                'comment': comment.comment
            }
            for comment in comments
        ]
                
        article_data = {
            'id': str(article.id),
            'title': article.title,
            'content': article_content,
            'categoryes': categories  # カテゴリー情報を追加
        }
        data = OrderedDict([
            ('request_url', request.build_absolute_uri()),
            ('status', 'ok'),
            ('members', article_data),
            ('comment', comments_data),
        ])
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        return HttpResponse(json_str, content_type='application/json; charset=utf-8')