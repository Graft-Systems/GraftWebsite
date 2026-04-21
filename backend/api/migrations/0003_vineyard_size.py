from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_waitlistentry"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactsubmission",
            name="vineyard_size_acres",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
