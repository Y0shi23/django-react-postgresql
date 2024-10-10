from django.http import JsonResponse
from django.views import View

from collections import OrderedDict

from blog.models import Articles, Post_Articles
import markdown

class ArticlesViewAll(View):
    def get(self, request):
        articles = Articles.objects.all()
        
        # Post_Articlesのカテゴリ情報をリスト形式で保存しておく
        category_dict = {}
        for post_article in Post_Articles.objects.all():
            # post_article.category が Category_Master オブジェクトの場合、それを辞書に変換
            category_data = post_article.category.category_name
            if post_article.article.id not in category_dict:
                category_dict[post_article.article.id] = []
            # 記事毎のカテゴリー名をリストに追加
            category_dict[post_article.article.id].append(category_data)

        # 記事情報のリストを作成
        articles_data = [
            {
                'id': str(article.id),
                'title': article.title,
                'content': markdown.markdown(article.context),
                'categoryes': category_dict.get(article.id, [])  # 各記事に対応するカテゴリを設定
            }
            for article in articles
        ]

        # JSONレスポンスデータを構成
        data = OrderedDict([
            ('request_url', request.build_absolute_uri()),
            ('status', 'ok'),
            ('members', articles_data),
        ])

        return JsonResponse(data, json_dumps_params={'ensure_ascii': False, 'indent': 2})