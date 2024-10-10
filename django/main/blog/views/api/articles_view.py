from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.views import View

from collections import OrderedDict

from blog.models import Articles, Comment
import json
import markdown

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
        
        # Commentsのコメント情報をリスト形式で保存しておく
        comment_dict = {}
        # 全てのコメントをループ
        for comment in Comment.objects.all():
            article_id = comment.article.id
            comment_data = {
                'user_name': comment.user_name,
                'comment': comment.comment
            }
            print(comment)
            # 記事IDに対するコメントが初めての場合、新しいリストを作成
            if article_id not in comment_dict:
                comment_dict[article_id] = [comment_data]
            else:
                # 既にリストがある場合はコメントを追加
                comment_dict[article_id].append(comment_data)
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
            ('comment', comment_dict.get(article.id, [])),
        ])
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        return HttpResponse(json_str, content_type='application/json; charset=utf-8')