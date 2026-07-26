FROM python:3.13-slim

WORKDIR /app

ENV FLASK_APP=app.py

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

# instance/ holds the SQLite database -- mount a volume here to persist data
RUN mkdir -p /app/instance
VOLUME /app/instance

EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
