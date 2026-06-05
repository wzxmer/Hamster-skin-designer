# 访问人数统计服务器说明

工作台前端已经预留访问人数统计入口，但不会在浏览器里伪造人数。

统计逻辑必须放在可公网访问的服务器上。前端只负责：

- 首次访问生成匿名 `visitorId`
- 把 `visitorId` 发给统计接口
- 显示接口返回的唯一访客数

## 前端接入

在 `apps/workbench/index.html` 里填写统计接口地址：

```html
<meta name="hamster-visitor-stats-endpoint" content="https://poultry.jiaqinyy.cn/hamster-stats/visit" />
```

接口未配置时，顶部显示 `访问 --`，不会请求服务器，也不会本地累加。

## 接口要求

请求：

```http
POST /hamster-stats/visit
Content-Type: application/json
```

请求体：

```json
{
  "visitorId": "匿名访客 ID",
  "app": "hamster-skin-designer-workbench",
  "path": "/apps/workbench/"
}
```

响应体任选以下字段之一：

```json
{ "uniqueVisitors": 123 }
```

```json
{ "visitors": 123 }
```

```json
{ "count": 123 }
```

必须支持 CORS。至少允许工作台部署域名，例如：

```http
Access-Control-Allow-Origin: https://你的用户名.github.io
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## 推荐统计策略

使用 `visitorId` 作为主要去重依据，不要按刷新次数统计。

可选地记录 IP 哈希作为辅助风控，但不要保存明文 IP。

## 已验证部署

当前服务代码在 `tools/visitor-stats-server/`，使用 Node 内置模块实现，不需要 npm 依赖或数据库。

服务器部署路径：

```bash
/home/ubuntu/visitor-stats-server
```

Docker Compose 关键配置：

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

Nginx 容器是 `nginx-web`，配置文件挂载在：

```bash
/usr/local/docker/nginx/conf/nginx.conf
```

已在 `poultry.jiaqinyy.cn` 的 `server` 中增加反代：

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

修改 Nginx 配置后必须先测试再重载：

```bash
sudo docker exec nginx-web nginx -t
sudo docker exec nginx-web nginx -s reload
```

## 验证命令

```bash
curl -s https://poultry.jiaqinyy.cn/hamster-stats/visit \
  -H "Origin: https://wzxmer.github.io" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test-visitor-001","app":"hamster-skin-designer-workbench","path":"/apps/workbench/"}'
```

预期返回：

```json
{"uniqueVisitors":1}
```
