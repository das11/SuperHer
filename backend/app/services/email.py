import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Any, Optional
import logging
import os
from app.core.config import settings

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

# Setup logging
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.ses_client = None
        self.logo_bytes = None
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            try:
                self.ses_client = boto3.client(
                    'ses',
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                )
            except Exception as e:
                logger.error(f"Failed to initialize SES client: {e}")
        
        # Load Logo
        self._load_logo()

    def _load_logo(self):
        """Loads the logo file as bytes for embedding."""
        try:
            # Local dev path provided by user:
            logo_path = "/Users/interfacev2/KXM-BM/Prospects/SuperHer/Dev/Superher-logo.png"
            if os.path.exists(logo_path):
                with open(logo_path, "rb") as image_file:
                    self.logo_bytes = image_file.read()
            else:
                logger.warning(f"Logo file not found at {logo_path}")
        except Exception as e:
            logger.error(f"Failed to load logo: {e}")

    def get_email_template(self, title: str, recipient_name: str, content_html: str) -> str:
        """
        Returns a formatted HTML email template.
        """
        # If logo exists, we reference it via CID. Otherwise text fallback.
        logo_html = ""
        if self.logo_bytes:
            logo_html = '<img src="cid:logo" alt="SuperHer Logo" style="height: 40px; width: auto;">'
        else:
            logo_html = '<h1 style="color: #7C3AED; margin: 0; font-size: 24px;">SuperHer</h1>'

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px; }}
                .header {{ background-color: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e2e8f0; text-align: center; }}
                .content {{ padding: 32px; color: #334155; line-height: 1.6; }}
                .h1 {{ color: #1e293b; font-size: 20px; font-weight: 700; margin-top: 0; }}
                .card {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 12px; }}
                .code {{ font-family: monospace; font-size: 18px; font-weight: 700; color: #7C3AED; letter-spacing: 1px; background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px dashed #7C3AED; display: inline-block; }}
                .footer {{ background-color: #f1f5f9; padding: 24px; text-align: center; color: #64748b; font-size: 12px; }}
                .btn {{ display: inline-block; background-color: #7C3AED; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; }}
                .label {{ font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    {logo_html}
                </div>
                <div class="content">
                    <h2 class="h1">Hello {recipient_name},</h2>
                    {content_html}
                    <p style="margin-top: 30px;">Good luck with the campaign!</p>
                    <p style="color: #64748b;">The SuperHer Team</p>
                </div>
                <div class="footer">
                    &copy; 2026 SuperHer. All rights reserved.<br>
                    <span style="opacity: 0.7;">You received this email because you are a partner influencer.</span>
                </div>
            </div>
        </body>
        </html>
        """

    def send_email(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """
        Sends an email using AWS SES raw interface to support inline images (CID).
        """
        if not self.ses_client:
            logger.info(f"EMAIL SIMULATION [To: {to_email}] [Subject: {subject}]")
            logger.info(f"HTML Body Length: {len(html_body)}")
            return True

        # Create the root message - use 'related' for inline images
        msg = MIMEMultipart('related')
        msg['Subject'] = subject
        msg['From'] = settings.SENDER_EMAIL or "noreply@superher.com"
        msg['To'] = to_email

        # Create alternative part for Text vs HTML
        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        # Attach Text Body
        part_text = MIMEText(text_body, 'plain')
        msg_alternative.attach(part_text)

        # Attach HTML Body
        part_html = MIMEText(html_body, 'html')
        msg_alternative.attach(part_html)

        # Attach Logo (if exists)
        if self.logo_bytes:
            img = MIMEImage(self.logo_bytes)
            # Define the Content-ID
            img.add_header('Content-ID', '<logo>')
            # Prevent it from being an attachment file
            img.add_header('Content-Disposition', 'inline', filename='logo.png')
            msg.attach(img)

        try:
            response = self.ses_client.send_raw_email(
                Source=settings.SENDER_EMAIL,
                Destinations=[to_email],
                RawMessage={
                    'Data': msg.as_string(),
                }
            )
            logger.info(f"Email sent! Message ID: {response['MessageId']}")
            return True
        except ClientError as e:
            logger.error(f"Failed to send email via SES: {e.response['Error']['Message']}")
            return False

    def send_coupons(self, influencer_name: str, influencer_email: str, campaign_name: str, coupons: List[Any]):
        """
        Sends an email with a list of coupons.
        """
        subject = f"Your Coupons for {campaign_name} - SuperHer"
        
        # Build Coupons List HTML
        coupons_html = f"<p>Here are your assigned coupons for the campaign <strong>{campaign_name}</strong>:</p>"
        coupons_text = f"Here are your assigned coupons for the campaign {campaign_name}:\n\n"
        
        for coupon in coupons:
            coupons_html += f"""
            <div class="card">
                <span class="label">Coupon Code</span>
                <div class="code">{coupon.code}</div>
            </div>
            """
            coupons_text += f"- {coupon.code}\n"
        
        html_body = self.get_email_template(subject, influencer_name, coupons_html)
        
        text_body = f"""
        Hello {influencer_name},
        
        {coupons_text}
        
        Good luck!
        The SuperHer Team
        """
        
        return self.send_email(influencer_email, subject, html_body, text_body)

    def send_links(self, influencer_name: str, influencer_email: str, campaign_name: str, links: List[Any]):
        """
        Sends an email with a list of tracking links.
        """
        subject = f"Your Tracking Links for {campaign_name} - SuperHer"
        
        # Build Links List HTML
        links_html = f"<p>Here are your assigned tracking links for the campaign <strong>{campaign_name}</strong>:</p>"
        links_text = f"Here are your assigned tracking links for the campaign {campaign_name}:\n\n"
        
        for link in links:
            short_url = f"https://superher.in/api/v1/r/{link.short_code}"
            
            links_html += f"""
            <div class="card">
                <span class="label">Destination: {link.destination_url}</span>
                <a href="{short_url}" class="btn" style="width: 100%; box-sizing: border-box; text-align: center; margin-top: 8px;">{short_url}</a>
            </div>
            """
            links_text += f"- {short_url} (Dest: {link.destination_url})\n"
        
        html_body = self.get_email_template(subject, influencer_name, links_html)
        
        text_body = f"""
        Hello {influencer_name},
        
        {links_text}
        
        Good luck!
        The SuperHer Team
        """
        
        return self.send_email(influencer_email, subject, html_body, text_body)

email_service = EmailService()
