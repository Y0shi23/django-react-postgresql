# Generated by Django 5.1 on 2024-09-24 04:20

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0002_articles_alter_category_master_created_at_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Widget',
        ),
    ]
