FROM python:3.10.16
LABEL authors="nexent"

# Set correct permissions as root
USER root
RUN umask 0022

# Configure pip
RUN pip config --user set global.progress_bar off

# Install Python dependencies
COPY backend/requirements.txt /opt/backend/requirements.txt
COPY sdk /opt/sdk
RUN cd /opt/sdk && pip install --user --no-cache-dir . -i https://mirrors.aliyun.com/pypi/simple
RUN pip install --user --no-cache-dir -r /opt/backend/requirements.txt -i https://mirrors.aliyun.com/pypi/simple
