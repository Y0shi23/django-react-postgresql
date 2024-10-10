from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from blog.models import Likes, Articles

class LikePost(View):
    def get_client_ip(self, request):
        """クライアントのIPアドレスを取得するヘルパーメソッド"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get(self, request, post_id):
        # 特定の投稿に対する「いいね」の数を取得
        blog_post = get_object_or_404(Articles, id=post_id)
        like_count = Likes.objects.filter(blog_post=blog_post).count()

        # JSONで返す
        return JsonResponse({'like_count': like_count}, status=200)
    
    @csrf_exempt  # CSRFチェックを無効化
    def post(self, request, post_id):
        # ブログ記事の取得
        blog_post = get_object_or_404(Articles, id=post_id)
        
        # セッションIDの取得または作成
        session_id = request.session.session_key
        if not session_id:
            request.session.create()
            session_id = request.session.session_key

        # クライアントのIPアドレスを取得
        ip_address = self.get_client_ip(request)

        # すでに「いいね」されているか確認
        like_exists = Likes.objects.filter(ip_address=ip_address, session_id=session_id, blog_post=blog_post).exists()

        if like_exists:
            return JsonResponse({'message': 'Already liked'}, status=400)

        # 新しい「いいね」を作成
        like = Likes(blog_post=blog_post, ip_address=ip_address, session_id=session_id)
        like.save()

        return JsonResponse({'message': 'Liked successfully'}, status=201)