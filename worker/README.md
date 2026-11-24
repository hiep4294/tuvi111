# Hiep TuVi AI Worker 1.1.0

Worker nhận prompt tổng hợp từ web Tử Vi và gọi Claude, ChatGPT hoặc Gemini. Khóa API của chế độ Worker được lưu ở Cloudflare.

## Cấu hình

Chạy Wrangler từ thư mục gốc của repo. Sao chép `worker/wrangler.toml.example` thành `wrangler.toml` và đặt `ALLOWED_ORIGIN` thành origin của web, ví dụ `https://hiep4294.github.io`. Đặt secret cho từng nhà cung cấp muốn dùng. Chỉ cần một nhà cung cấp có khóa.

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
```

`ANTHROPIC_MODEL` mặc định là `claude-sonnet-5-5`. `OPENAI_MODEL` mặc định là `gpt-5-mini`. Có thể đổi các biến này theo model mà tài khoản được phép dùng. Với Gemini, `DEFAULT_MODEL` và `ALLOWED_MODELS` quy định model mặc định và danh sách được phép.

Sau khi triển khai bằng `npx wrangler deploy`, vào tab Prompt AI, chọn **Worker**, nhập URL HTTPS trên `workers.dev`, bấm **Lưu** rồi **Kiểm tra kết nối**. Nếu dùng tên miền Worker riêng, thêm origin đó vào `connect-src` của web. Nút **AI tổng hợp lại** gửi prompt lá số và thêm phần tổng hợp vào báo cáo Local Rules.

## API

`GET /health` (hoặc `GET /`) trả về `ok`, `service`, `version`, `default_model`, `allowed_models` và `providers`. Ba cờ boolean cho biết Worker đã có secret tương ứng hay chưa. Ví dụ `{"anthropic":true,"openai":true,"gemini":false}`. Endpoint này không gọi các API model.

`POST /analyze` nhận JSON như sau.

```json
{
  "provider": "auto",
  "prompt": "Tổng hợp từ dữ liệu lá số…",
  "max_output_tokens": 1800,
  "metadata": {}
}
```

`auto` thử lần lượt Anthropic, OpenAI và Gemini, bỏ qua nhà cung cấp thiếu khóa và chuyển tiếp khi gặp lỗi. Chọn `anthropic`, `openai` hoặc `gemini` để chỉ dùng một nhà cung cấp. Client cũ gửi `model` và bỏ qua `provider` vẫn dùng Gemini với allowlist cũ. Khi bỏ qua cả hai trường, Worker dùng `auto`.

Ví dụ phản hồi thành công.

```json
{
  "text": "Nội dung tổng hợp…",
  "provider": "openai",
  "model": "gpt-5-mini",
  "usage": {
    "prompt_token_count": 200,
    "candidates_token_count": 100,
    "total_token_count": 300
  },
  "metadata": {}
}
```

Khi hết nhà cung cấp khả dụng, Worker trả mã lỗi HTTP để web chuyển sang chuỗi dự phòng cục bộ. Với Worker công khai, có thể dùng Cloudflare rate limiting để giới hạn quota.
