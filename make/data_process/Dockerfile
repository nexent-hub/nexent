FROM downloads.unstructured.io/unstructured-io/unstructured:latest
LABEL authors="nexent"

# Set correct permissions as root
USER root
COPY backend /opt/backend
COPY sdk /opt/sdk

# Copy pre-downloaded model from workflow
COPY model-assets/clip-vit-base-patch32 /opt/models/clip-vit-base-patch32

RUN chown -R notebook-user:notebook-user /opt/backend
RUN chown -R notebook-user:notebook-user /opt/sdk
RUN chown -R notebook-user:notebook-user /opt/models
RUN chmod +x /opt/backend/data_process_service.py

WORKDIR /opt

USER notebook-user
RUN pip config --user set global.progress_bar off
RUN pip install --user --no-cache-dir -r backend/requirements.txt -i https://mirrors.aliyun.com/pypi/simple
RUN cd /opt/sdk && pip install . -i https://mirrors.aliyun.com/pypi/simple
RUN pip install --user --no-cache-dir "unstructured[all-docs]" -i https://mirrors.aliyun.com/pypi/simple

# Expose the service port
EXPOSE 5012

# Set the entrypoint
ENTRYPOINT ["python", "/opt/backend/data_process_service.py"]