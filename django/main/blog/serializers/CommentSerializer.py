from rest_framework import serializers
from blog.models import Comment

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'article', 'user_name', 'comment', 'created_at']
