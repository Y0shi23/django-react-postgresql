from django.http import HttpResponse
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views import View

from collections import OrderedDict
from datetime import datetime
from zoneinfo import ZoneInfo

from blog.models import Articles, Post_Articles
import json
import markdown

class IndexView(View):

    def get(self, request):
        datetime_now = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y年%m月%d日 %H:%M:%s")
        return render(
            request, "blog/index.html", {"datetime_now" : datetime_now}
        )

class ArticlesView(View):
    # 記事詳細のビュー
    def get(self, request, pk):
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
        
        # 必要に応じてpkや他のUUIDフィールドを文字列に変換
        article_data = {
            'id': str(article.id),
            'title': article.title,
            'content': article_content,
        }
        data = OrderedDict([
            ('request_url', request.build_absolute_uri()),
            ('status', 'ok'),
            ('members', article_data),
        ])

        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        return HttpResponse(json_str, content_type='application/json; charset=utf-8')

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

    #def get(self, request, pk):
    #    article = get_object_or_404(Articles, pk=pk)
    #    # MarkdownをHTMLに変換
    #    article_content = markdown.markdown(article.context)

    #    get_json = {'article': article, 'article_content': article_content}
    #    parse_json = render(
    #        request, 'detail/article_detail.html', {"aaa": get_json}
    #    )
    #    return parse_json

# インデックスビューを呼び出し可能にする
index = IndexView.as_view()
article_detail = ArticlesView.as_view()
articles_all = ArticlesViewAll.as_view()
