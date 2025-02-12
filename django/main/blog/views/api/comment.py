from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from blog.models import Comments, Articles
from blog.serializers.CommentSerializer import CommentSerializer

class PostCommentView(APIView):
    def get(self, request, post_id):
        # post_idに紐づくコメントを取得
        comments = Comments.objects.filter(article_id=post_id)
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request, post_id):
        try:
            # post_id に対応する記事を取得
            article = Articles.objects.get(id=post_id)
        except Articles.DoesNotExist:
            return Response({'error': '記事が存在しません'}, status=status.HTTP_404_NOT_FOUND)

        # リクエストデータに記事を追加
        data = request.data.copy()
        data['article'] = str(article.id)  # UUIDを文字列に変換

        # シリアライザーでデータを検証・保存
        serializer = CommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # 詳細なエラーメッセージを出力
            print("Serializer errors:", serializer.errors)  # エラーメッセージを確認
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
