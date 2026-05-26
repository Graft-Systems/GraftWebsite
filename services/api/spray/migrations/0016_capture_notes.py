from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("spray", "0015_newsroom"),
    ]

    operations = [
        migrations.AddField(
            model_name="capture",
            name="notes",
            field=models.TextField(blank=True),
        ),
    ]
