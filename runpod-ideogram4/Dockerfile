FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

ENV PYTHONUNBUFFERED=1

WORKDIR /workspace

# Install Python dependencies
COPY requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -r /workspace/requirements.txt

# Vendor ideogram4 source (pure Python, avoids torch>=2.11 pyproject bug)
COPY ideogram4/ /workspace/ideogram4/

COPY handler.py /workspace/handler.py

CMD ["python", "-u", "handler.py"]
