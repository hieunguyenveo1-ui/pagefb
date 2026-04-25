# Facebook Fanpage Manager MVP

Ứng dụng MVP quản lý nhiều Facebook account, nhiều fanpage và lịch đăng bài an toàn theo hướng tuân thủ Meta Platform Policy.

## Tính năng hiện có

- Dashboard tổng quan account, fanpage, post, publish queue và audit log.
- Quản lý Facebook account/fanpage dạng mock để prototype nhanh.
- Soạn bài, chọn nhiều fanpage, lưu draft, lập lịch hoặc đưa vào queue đăng ngay.
- Meta Graph connector có `mock` mode mặc định và `live` mode placeholder.
- Safety guard:
  - Cảnh báo khi chọn quá nhiều page cho cùng một nội dung.
  - Giới hạn số post targets theo giờ/ngày.
  - Kiểm tra nội dung tương tự trong 24 giờ gần nhất.
  - Chặn publish/schedule khi safety score quá cao.
- API routes:
  - `POST /api/accounts`
  - `POST /api/pages`
  - `POST /api/posts`
  - `POST /api/publish`
  - `POST /api/safety`

## Local setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment

```env
DATABASE_URL="file:./dev.db"
META_GRAPH_VERSION="v25.0"
PUBLISH_MODE="mock"
META_APP_ID=""
META_APP_SECRET=""
META_REDIRECT_URI="http://localhost:3000/api/auth/facebook/callback"
```

`PUBLISH_MODE=live` cần Page Access Token thật và Meta App đã được review quyền phù hợp.

## Meta permissions dự kiến

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `pages_manage_metadata`
- `pages_manage_engagement`
- `pages_messaging` cho phase inbox/chat
- `publish_video` cho phase video

## Lưu ý tuân thủ

App không hỗ trợ né hệ thống chống spam/khóa tài khoản. Các cơ chế safety guard nhằm giảm rủi ro bằng lịch đăng hợp lý, kiểm duyệt nội dung, rate limit, audit log và tuân thủ chính sách Meta.
