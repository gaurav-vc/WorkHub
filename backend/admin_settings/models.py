from django.db import models

class Role(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    usersCount = models.IntegerField(default=0)
    # JSONField is perfect here to store all the true/false checkbox permissions cleanly
    permissions = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name

class AuditLog(models.Model):
    user = models.CharField(max_length=100)
    action = models.CharField(max_length=100)
    target = models.CharField(max_length=250)
    time = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.user} - {self.action}"