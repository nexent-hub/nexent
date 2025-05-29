import json
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from pydantic import Field
from smolagents.tools import Tool


class SendEmailTool(Tool):
    name = "send_email"
    description = "Send email to specified recipients. Supports only HTML formatted email content, and can add multiple recipients, CC, and BCC."

    inputs = {
        "to": {"type": "string", "description": "Recipient email address, multiple recipients separated by commas"},
        "subject": {"type": "string", "description": "Email subject"},
        "content": {"type": "string", "description": "Email content, supports HTML format"},
        "cc": {"type": "string", "description": "CC email address, multiple CCs separated by commas, optional",
               "nullable": True},
        "bcc": {"type": "string", "description": "BCC email address, multiple BCCs separated by commas, optional",
                "nullable": True}}
    output_type = "string"

    def __init__(self, smtp_server: str=Field(description="SMTP服务器地址"),
                 smtp_port: int=Field(description="SMTP服务器端口"), 
                 username: str=Field(description="SMTP服务器用户名"), 
                 password: str=Field(description="SMTP服务器密码"), 
                 use_ssl: bool=Field(description="是否使用SSL", default=True),
                 sender_name: Optional[str] = Field(description="发件人名称", default=None),
                 timeout: int = Field(description="超时时间", default=30)):
        super().__init__()
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.sender_name = sender_name
        self.timeout = timeout

    def forward(self, to: str, subject: str, content: str, cc: str = "", bcc: str = "") -> str:
        try:
            print("Creating email message...")
            # 创建邮件对象
            msg = MIMEMultipart()
            msg['From'] = f"{self.sender_name} <{self.username}>" if self.sender_name else self.username
            msg['To'] = to
            msg['Subject'] = subject

            if cc:
                msg['Cc'] = cc
            if bcc:
                msg['Bcc'] = bcc

            # 添加邮件内容
            msg.attach(MIMEText(content, 'html'))

            print(f"Connecting to SMTP server {self.smtp_server}:{self.smtp_port}...")

            # 创建SSL上下文
            context = ssl.create_default_context()
            context.check_hostname = True
            context.verify_mode = ssl.CERT_REQUIRED

            # 使用SSL连接SMTP服务器
            print("Using SSL connection...")
            server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context, timeout=self.timeout)

            print("Logging in...")
            # 登录
            server.login(self.username, self.password)

            # 发送邮件
            recipients = [to]
            if cc:
                recipients.extend(cc.split(','))
            if bcc:
                recipients.extend(bcc.split(','))

            print("Sending email...")
            server.send_message(msg)
            print("Email sent successfully!")

            server.quit()

            return json.dumps({"status": "success", "message": "Email sent successfully", "to": to, "subject": subject},
                ensure_ascii=False)

        except smtplib.SMTPException as e:
            print(f"SMTP Error: {str(e)}")
            return json.dumps({"status": "error", "message": f"Failed to send email: {str(e)}"}, ensure_ascii=False)
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return json.dumps({"status": "error", "message": f"An unexpected error occurred: {str(e)}"},
                ensure_ascii=False)


if __name__ == "__main__":
    # 创建邮件工具实例
    email_tool = SendEmailTool(smtp_server="smtp.qq.com", smtp_port=465,  # 使用SSL端口
        username="564516720@qq.com", password="sxfktetgcswhbbha", use_ssl=True, sender_name="Test Sender", timeout=30)

    # 发送测试邮件
    result = email_tool.forward(to="chenshuangrui@icloud.com", subject="Test Email from EmailTool",
        content="<h1>Hello!</h1><p>This is a test email from EmailTool.</p>")

    print(f"\nResult: {result}")
