from django.db import models
from vocabulary.models.words import Words
from vocabulary.models.part_of_seppch import PartOfSpeech
import uuid

# 単語の意味モデル
class WordMeaning(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    word = models.ForeignKey(Words, related_name='meanings', on_delete=models.CASCADE)
    part_of_speech = models.ForeignKey(PartOfSpeech, related_name='meanings', on_delete=models.CASCADE)
    word_meaning = models.TextField()
    example = models.TextField(null=True, blank=True)
    example_meaning = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(blank=True, null=True, verbose_name="更新日時")

    def __str__(self):
        return f"{self.word.word} - {self.part_of_speech.name}"