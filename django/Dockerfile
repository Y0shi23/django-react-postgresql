# ベースイメージ
FROM python:3.12.6

# 作業ディレクトリを作成
WORKDIR /app

# 必要なシステムパッケージのインストール
RUN apt-get update && apt-get install -y \
    libpq-dev \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Pipenvのインストール
RUN pip install pipenv && pip install django==5.1 && pip install python-dotenv && pip install psycopg2
RUN pip install djangorestframework && pip install markdown --upgrade && pip install pyyaml markdown-it-py
RUN pip install dj-rest-auth && pip install django-allauth && pip install django-cors-headers
RUN pip install djangorestframework-simplejwt && pip install django-extensions
# RUN pip install djoser


# 作業ディレクトリを作成
WORKDIR /app/main

# Pipfileをコピー
COPY Pipfile ./

# Pipfile.lockのコピーを省略するか、生成後にチェック
COPY Pipfile.lock ./

# Pipenvを使って依存パッケージをインストール
RUN pipenv install --deploy --system

# プロジェクトファイルをコピー
COPY . .

# ポートの指定
EXPOSE 8000
