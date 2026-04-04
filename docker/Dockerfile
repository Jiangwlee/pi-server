FROM node:22-bookworm-slim

WORKDIR /app

RUN rm -f /etc/apt/sources.list.d/debian.sources \
  && cat > /etc/apt/sources.list <<'EOF'
deb http://mirrors.aliyun.com/debian/ bookworm main non-free contrib
deb-src http://mirrors.aliyun.com/debian/ bookworm main non-free contrib
deb http://mirrors.aliyun.com/debian-security/ bookworm-security main
deb-src http://mirrors.aliyun.com/debian-security/ bookworm-security main
deb http://mirrors.aliyun.com/debian/ bookworm-updates main non-free contrib
deb-src http://mirrors.aliyun.com/debian/ bookworm-updates main non-free contrib
EOF

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ tzdata \
  && rm -rf /var/lib/apt/lists/*

RUN npm config set registry https://registry.npmmirror.com
ENV PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
ENV PIP_TRUSTED_HOST=mirrors.aliyun.com

COPY package.json package-lock.json /app/

RUN npm config set loglevel verbose \
  && npm ci --verbose

COPY . /app

RUN npm run build --verbose

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
