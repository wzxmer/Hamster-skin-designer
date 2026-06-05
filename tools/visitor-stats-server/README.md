# 元书皮肤工具访问统计服务

这是给 `apps/workbench` 顶部访问人数使用的最小服务器。

特点：

- 不用 Cloudflare Worker。
- 不需要安装数据库。
- 不按刷新次数累加。
- 使用浏览器匿名 `visitorId` 去重。
- 数据保存到 `visitor-stats.json`。
- 可选记录 IP 哈希，不保存明文 IP。

## Docker 部署

如果服务器已有 Docker Nginx，推荐统计服务也用 Docker 运行，不需要在宿主机安装 Node.js、npm、pm2。

已验证的服务器路径：

```bash
/home/ubuntu/visitor-stats-server
```

示例 `docker-compose.yml`：

```yaml
services:
  hamster-visitor-stats:
    image: node:20-alpine
    container_name: hamster-visitor-stats
    restart: always
    working_dir: /app
    command: node server.cjs
    environment:
      PORT: 3002
      ALLOWED_ORIGIN: https://wzxmer.github.io
      IP_HASH_SALT: 换成新的随机长字符串
      DATA_FILE: /app/data/visitor-stats.json
    volumes:
      - ./:/app
      - ./data:/app/data
    networks:
      - nginx_default

networks:
  nginx_default:
    external: true
```

启动：

```bash
cd /home/ubuntu/visitor-stats-server
sudo docker compose up -d
sudo docker logs hamster-visitor-stats
sudo docker exec hamster-visitor-stats wget -qO- http://127.0.0.1:3002/health
```

健康检查应返回：

```json
{"ok":true}
```

## Docker Nginx 反代

当前服务器的对外 Nginx 容器是 `nginx-web`，配置文件挂载在宿主机：

```bash
/usr/local/docker/nginx/conf/nginx.conf
```

接入前先备份：

```bash
sudo cp /usr/local/docker/nginx/conf/nginx.conf /usr/local/docker/nginx/conf/nginx.conf.bak.$(date +%Y%m%d-%H%M%S)
```

在目标 `server` 中加入：

```nginx
location /hamster-stats/ {
    proxy_pass http://hamster-visitor-stats:3002/hamster-stats/;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 60;
}
```

测试并平滑重载：

```bash
sudo docker exec nginx-web nginx -t
sudo docker exec nginx-web nginx -s reload
```

公网测试：

```bash
curl -i https://poultry.jiaqinyy.cn/hamster-stats/visit \
  -H "Origin: https://wzxmer.github.io" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test-visitor-001","app":"hamster-skin-designer-workbench","path":"/apps/workbench/"}'
```

应该返回 `200 OK` 和：

```json
{"uniqueVisitors":1}
```

如果只想看响应 body：

```bash
curl -s https://poultry.jiaqinyy.cn/hamster-stats/visit \
  -H "Origin: https://wzxmer.github.io" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test-visitor-002","app":"hamster-skin-designer-workbench","path":"/apps/workbench/"}'
```

## Node 直接运行

如果不使用 Docker，也可以在安装 Node.js 18+ 后直接运行：

```bash
PORT=3002 ALLOWED_ORIGIN=https://wzxmer.github.io IP_HASH_SALT=换成随机长字符串 node server.cjs
```

Nginx 反代地址对应改为：

```nginx
proxy_pass http://127.0.0.1:3002/hamster-stats/;
```

## 接入工作台

打开：

```text
apps/workbench/index.html
```

把这里的 `content` 改成你的接口地址：

```html
<meta name="hamster-visitor-stats-endpoint" content="https://poultry.jiaqinyy.cn/hamster-stats/visit" />
```

重新部署到 GitHub Pages 后，顶部会显示：

```text
访问 1
```

如果显示 `访问 --`：

- `content` 还没填接口地址。
- 服务器没有启动。
- HTTPS / 域名 / Nginx 反代没配好。
- CORS 的 `ALLOWED_ORIGIN` 不是你的 GitHub Pages 地址。

## 数据文件

访问数据保存在：

```text
visitor-stats.json
```

不要提交这个文件。目录里的 `.gitignore` 已经排除了它。
