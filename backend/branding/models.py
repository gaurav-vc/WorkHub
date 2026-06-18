from django.db import models

class BrandSetting(models.Model):
    companyName = models.CharField(max_length=150, default="WorkHub")
    primaryColor = models.CharField(max_length=20, default="#2563EB")
    accentColor = models.CharField(max_length=20, default="#7C3AED")
    logo = models.TextField(blank=True, default="")
    font = models.CharField(max_length=50, default="inter")
    customDomain = models.CharField(max_length=100, blank=True, default="")
    companyWebsite = models.CharField(max_length=200, blank=True, default="https://www.yourcompany.com")
    darkModeDefault = models.BooleanField(default=False)
    showWelcomeBanner = models.BooleanField(default=True)
    sidebarStyle = models.CharField(max_length=50, default="full")

    def __str__(self):
        return self.companyName