from django.contrib import admin
from vocabulary.models.words import Words
from vocabulary.models.part_of_seppch import PartOfSpeech
from vocabulary.models.means import WordMeaning
from vocabulary.models.educations import Difficulty

# Register your models here.

@admin.register(Words)
class PostWordsAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]

@admin.register(PartOfSpeech)
class PostPartOfSpeechAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]

@admin.register(WordMeaning)
class PostWordMeaningAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]

@admin.register(Difficulty)
class PostDifficultyAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at"]
