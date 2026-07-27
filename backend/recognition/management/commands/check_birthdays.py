from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from directory.models import Employee
from recognition.models import Kudos
import datetime

class Command(BaseCommand):
    help = 'Check for birthdays today and automatically send Happy Birthday emails/kudos'

    def handle(self, *args, **kwargs):
        today = datetime.date.today()
        
        # Get employees whose birthday is today
        # Because date_of_birth includes the year, we must match month and day
        employees = Employee.objects.filter(
            date_of_birth__month=today.month,
            date_of_birth__day=today.day
        )
        
        count = 0
        for emp in employees:
            self.stdout.write(f"Processing birthday for {emp.name}...")
            
            # 1. Automatically generate a Kudos on the Recognition Wall
            # Check if one was already auto-generated today to avoid duplicates
            already_generated = Kudos.objects.filter(
                to_name=emp.name,
                category="Above & Beyond",
                from_name="System Bot",
                created_at__date=today
            ).exists()
            
            if not already_generated:
                Kudos.objects.create(
                    organization=emp.organization,
                    site=emp.site,
                    from_name="System Bot",
                    from_initials="SB",
                    to_name=emp.name,
                    to_initials=emp.initials,
                    message=f"🎉 Happy Birthday, {emp.name}! Wishing you a fantastic day from the entire team! 🎂",
                    category="Above & Beyond",
                    reactions=0
                )
                
                # 2. Trigger Real-Time SMTP Email
                if emp.email:
                    try:
                        from django.conf import settings
                        backend_url = getattr(settings, 'BACKEND_URL', 'http://127.0.0.1:8000')
                        
                        org_logo_url = f"{backend_url}{emp.organization.logo.url}" if emp.organization and emp.organization.logo else ""
                        photo_url = f"{backend_url}{emp.photo.url}" if emp.photo else ""
                        
                        html_message = f"""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;600;700&display=swap');
                            </style>
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Inter', sans-serif;">
                            <div style="background-image: url('https://www.transparenttextures.com/patterns/cubes.png'); padding: 40px 20px;">
                                <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f26f21 0%, #8b3484 100%); position: relative; overflow: hidden; transform: skewY(-2deg); padding: 50px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
                                    <div style="transform: skewY(2deg); text-align: center; position: relative; z-index: 2;">
                                        <div style="position: absolute; top: -30px; right: 20px;">
                                            {f'<img src="{org_logo_url}" alt="Company Logo" style="height: 40px; background: white; padding: 5px; border-radius: 4px;"/>' if org_logo_url else ''}
                                        </div>
                                        <div style="margin-top: 20px;">
                                            <h3 style="margin: 0; color: #000; font-size: 20px; font-weight: 700;">Happy</h3>
                                            <h1 style="margin: -10px 0 20px 0; color: #fff; font-family: 'Great Vibes', cursive; font-size: 64px; font-weight: 400;">Birthday</h1>
                                        </div>
                                        <div style="margin: 20px auto;">
                                            {f'<img src="{photo_url}" alt="Profile Photo" style="width: 200px; height: 200px; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"/>' if photo_url else '<div style="width: 200px; height: 200px; background: rgba(255,255,255,0.2); margin: 0 auto; border: 4px solid white;"></div>'}
                                        </div>
                                        <h2 style="color: white; font-size: 32px; font-weight: 700; margin: 20px 0 10px 0; letter-spacing: 0.5px;">
                                            {emp.name}
                                        </h2>
                                        <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5; max-width: 80%; margin: 0 auto 20px auto;">
                                            Wishing you a fantastic birthday<br/>
                                            filled with joy, success, and<br/>
                                            wonderful moments!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </body>
                        </html>
                        """

                        from django.core.mail import EmailMultiAlternatives
                        from email.mime.image import MIMEImage
                        import os
                        
                        email_msg = EmailMultiAlternatives(
                            subject=f"Happy Birthday, {emp.name}! 🎉",
                            body=f"Happy Birthday {emp.name}!",
                            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'Konnect@envisageideas.com'),
                            to=[emp.email],
                        )
                        
                        # Prepare HTML message
                        html = html_message
                        
                        # Attach profile photo inline
                        if emp.photo:
                            try:
                                photo_path = emp.photo.path
                                if os.path.exists(photo_path):
                                    with open(photo_path, 'rb') as f:
                                        img = MIMEImage(f.read())
                                        img.add_header('Content-ID', '<profile_photo>')
                                        img.add_header('Content-Disposition', 'inline')
                                        email_msg.attach(img)
                                        # Update HTML to use CID
                                        html = html.replace(photo_url, "cid:profile_photo")
                            except Exception as e:
                                self.stdout.write(self.style.WARNING(f"Could not attach inline photo: {e}"))
                                
                        # Attach organization logo inline
                        if emp.organization and emp.organization.logo:
                            try:
                                logo_path = emp.organization.logo.path
                                if os.path.exists(logo_path):
                                    with open(logo_path, 'rb') as f:
                                        logo_img = MIMEImage(f.read())
                                        logo_img.add_header('Content-ID', '<org_logo>')
                                        logo_img.add_header('Content-Disposition', 'inline')
                                        email_msg.attach(logo_img)
                                        # Update HTML to use CID
                                        html = html.replace(org_logo_url, "cid:org_logo")
                            except Exception as e:
                                self.stdout.write(self.style.WARNING(f"Could not attach inline logo: {e}"))
                                
                        email_msg.attach_alternative(html, "text/html")
                        email_msg.send(fail_silently=False)
                        
                        self.stdout.write(self.style.SUCCESS(f"Successfully sent birthday email to {emp.email}"))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Failed to send email to {emp.email}: {e}"))
                
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Finished checking birthdays. Processed {count} employees."))
