# Hiep TuVi AI Worker

Backend giữ `GEMINI_API_KEY` và cung cấp contract đơn giản cho web `tuvi111`:

- `GET /` hoặc `GET /health`
- `POST /analyze`

## Triển khai Cloudflare Worker

1. Cài Node.js và Wrangler.
2. Sao chép `worker/wrangler.toml.example` thành `wrangler.toml`.
3. Đặt `ALLOWED_ORIGIN` về origin thật của web, ví dụ `https://hiep4294.github.io` hoặc domain riêng.
4. Không ghi API key vào file. Lưu secret:

```bash
npx wrangler secret put GEMINI_API_KEY
```

5. Deploy:

```bash
npx wrangler deploy
```

6. Lấy URL Worker HTTPS, mở `tuvi111`, vào phần AI và nhập URL đó.
7. Bấm **Kiểm tra** rồi **Phân tích chuyên sâu — 15 bước**.

## Model

Model được quản lý bằng biến môi trường:

```toml
DEFAULT_MODEL = "gemini-3.8-flash"
ALLOWED_MODELS = "gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash"
```

Frontend cũ hiện có thể gửi `gemini-3.5-flash`; Worker chấp nhận nếu model còn trong allowlist. Có thể đổi model mà không sửa lớp luận giải Hiep TuVi AI.

## Contract `POST /analyze`

Request:

```json
{
  "prompt": "...",
  "model": "gemini-3.5-flash",
  "max_output_tokens": 2800,
  "metadata": {}
}
```

Response:

```json
{
  "text": "...",
  "model": "gemini-3.5-flash",
  "usage": {
    "prompt_token_count": 0,
    "candidates_token_count": 0,
    "total_token_count": 0
  },
  "metadata": {}
}
```

## Bảo mật

- Không commit `GEMINI_API_KEY`.
- Nên đặt `ALLOWED_ORIGIN` thay vì để trống.
- Nếu Worker được public rộng, nên bổ sung Cloudflare rate limiting/WAF để tránh người khác dùng quota.
- Prompt chứa thông tin ngày giờ sinh; chỉ bật AI khi người dùng chủ động. Chế độ lập lá số cục bộ vẫn hoạt động nếu AI tắt.
