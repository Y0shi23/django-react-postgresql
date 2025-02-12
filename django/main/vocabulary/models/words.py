from django.db import models
from vocabulary.models.educations import Difficulty
import uuid

class Words(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    word = models.CharField(max_length=255)
    difficulty = models.IntegerField()
    education = models.ForeignKey(Difficulty, related_name='教育レベル', on_delete=models.deletion.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")

    def __str__(self):
        return self.word

#id	INTEGER	主キー、自動増分
#word	TEXT	英単語
#definition	TEXT	英単語の定義
#example	TEXT	例文
#difficulty	INTEGER	難易度（1〜5など）