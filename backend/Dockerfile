FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY tests ./tests
EXPOSE 8000
# Railway injects PORT; local/docker compose can override or use the default.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
