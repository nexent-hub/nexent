import email
import imaplib
import json
from datetime import datetime, timedelta
from email.header import decode_header
from typing import List

from smolagents.tools import Tool
from pydantic import Field


class GetEmailTool(Tool):
    name = "get_email"
    description = (
        "Get emails from email server. Supports filtering emails by time range and sender (sender must be an email address, not a name or non-ASCII string; subject filtering is not supported due to IMAP limitations)."
    )

    inputs = {
        "days": {"type": "integer", "description": "Get emails from the past few days, default is 7 days", "default": 7,
                 "nullable": True},
        "sender": {"type": "string", "description": "Filter by sender (must be an email address, not a name or non-ASCII string)", "nullable": True},
        "max_emails": {"type": "integer", "description": "Maximum number of emails to retrieve, default is 10",
                       "default": 10, "nullable": True}}
    output_type = "string"

    def __init__(self, imap_server: str=Field(description="IMAP服务器地址"),
                 imap_port: int=Field(description="IMAP服务器端口"), 
                 username: str=Field(description="IMAP服务器用户名"), 
                 password: str=Field(description="IMAP服务器密码"), 
                 use_ssl: bool=Field(description="是否使用SSL", default=True),
                 timeout: int = Field(description="超时时间", default=30)):
        super().__init__()
        self.imap_server = imap_server
        self.imap_port = imap_port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.timeout = timeout

    def _decode_subject(self, subject):
        """解码邮件主题"""
        if subject is None:
            return ""
        decoded_chunks = []
        for chunk, encoding in decode_header(subject):
            if isinstance(chunk, bytes):
                decoded_chunks.append(chunk.decode(encoding or 'utf-8', errors='replace'))
            else:
                decoded_chunks.append(str(chunk))
        return ''.join(decoded_chunks)

    def _parse_email(self, msg):
        """解析邮件内容"""
        email_data = {"subject": self._decode_subject(msg["subject"]), "from": msg["from"], "date": msg["date"],
            "body": "", "attachments": []}

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    try:
                        email_data["body"] = part.get_payload(decode=True).decode()
                    except:
                        email_data["body"] = part.get_payload()
                elif part.get_filename():
                    email_data["attachments"].append(part.get_filename())
        else:
            try:
                email_data["body"] = msg.get_payload(decode=True).decode()
            except:
                email_data["body"] = msg.get_payload()

        return email_data

    def forward(self, days: int = 7, sender: str = None, max_emails: int = 10) -> List[str]:
        try:
            # 连接IMAP服务器
            mail = imaplib.IMAP4_SSL(self.imap_server, self.imap_port) if self.use_ssl else imaplib.IMAP4(
                self.imap_server, self.imap_port)
            mail.login(self.username, self.password)
            mail.select('INBOX')

            # 构建搜索条件
            search_criteria = []

            # 添加时间条件
            if days:
                date = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
                search_criteria.append(f'(SINCE "{date}")')

            # 添加发件人条件
            if sender:
                search_criteria.append(f'(FROM "{sender}")')

            # 执行搜索
            search_query = ' '.join(search_criteria)
            print(f"Searching emails with criteria: {search_query}")
            _, message_numbers = mail.search(None, search_query)

            # 获取邮件
            formatted_emails = []
            for num in message_numbers[0].split()[:max_emails]:
                _, msg_data = mail.fetch(num, '(RFC822)')
                email_body = msg_data[0][1]
                msg = email.message_from_bytes(email_body)
                parsed_email = self._parse_email(msg)

                # 创建JSON格式的邮件内容
                email_json = {"subject": parsed_email['subject'], "date": parsed_email['date'],
                    "from": parsed_email['from'], "body": parsed_email['body']}
                print(email_json)

                formatted_emails.append(json.dumps(email_json, ensure_ascii=False))

            # 关闭连接
            mail.close()
            mail.logout()

            return formatted_emails

        except imaplib.IMAP4.error as e:
            print(f"IMAP Error: {str(e)}")
            return [json.dumps({"error": f"Failed to retrieve emails: {str(e)}"}, ensure_ascii=False)]
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return [json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, ensure_ascii=False)]
        