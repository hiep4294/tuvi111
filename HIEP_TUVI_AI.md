# Hiep TuVi AI

Lớp AI chuyên gia dùng trực tiếp dữ liệu do `tuvi111` tính toán để tạo bài luận dài theo chuẩn `LONG_INTEGRATED`.

## Kiến trúc

```text
Thông tin sinh
    ↓
tuvi111 engine (Pyodide/Python)
    ↓
Chart JSON + Bát Tự + quan hệ cung + prompt gốc
    ↓
hiep-tuvi-ai.js
    ├─ khóa dữ kiện engine
    ├─ bổ sung checklist toàn bộ sao từng cung
    ├─ bắt buộc tam phương/tứ chính, Tứ Hóa, Tuần/Triệt, Tràng Sinh
    ├─ mở rộng Bát Tự: tàng can, Thập Thần, tháng lệnh, vượng-suy, điều hậu/phù-ức
    ├─ red-team và tổng hợp liên cung
    └─ quality gate + viết lại một lần nếu thiếu nội dung bắt buộc
    ↓
AI Worker / LLM
    ↓
Báo cáo 15 bước
```

`tuvi111` là nguồn dữ liệu tính toán. AI không được tự an lại sao hoặc âm thầm sửa Can Chi/Cục/Tứ Hóa/Tràng Sinh.

## 15 bước báo cáo

1. Tổng quan lá số
2. Mệnh
3. Phụ Mẫu
4. Phúc Đức
5. Điền Trạch
6. Quan Lộc
7. Nô Bộc
8. Thiên Di
9. Tật Ách
10. Tài Bạch
11. Tử Tức
12. Phu Thê
13. Huynh Đệ
14. Tứ Trụ Bát Tự
15. Kết luận tổng hợp + red-team

## Chuẩn bắt buộc cho từng cung

Mỗi cung phải có:

- nền cung, địa chi và Ngũ Hành;
- chính tinh, miếu/vượng/đắc/bình/hãm nếu engine có;
- **tất cả sao nguyên cục trong cung** và tác dụng của từng sao;
- tương tác sao và bộ/cách cục;
- Ngũ Hành cung ↔ sao ↔ Mệnh/Cục;
- Vòng Tràng Sinh;
- tam phương tứ chính + đối cung;
- nhị hợp và giáp cung;
- Tứ Hóa;
- Tuần/Triệt;
- Mệnh–Thân và cung liên đới;
- tổng hợp cung dài;
- kết luận Mạnh / Yếu / Điều kiện / confidence.

Quality gate hiện kiểm tra tối thiểu: độ dài, đủ tên sao, có tam phương, Tứ Hóa và kết luận. Nếu thiếu, hệ thống gửi lại prompt yêu cầu viết lại phần đó một lần.

## Bát Tự

Không đếm Ngũ Hành cơ học. Phải xét:

- bốn trụ và Nhật chủ;
- tàng can + Thập Thần;
- tiết khí/tháng lệnh;
- căn, sinh trợ, tiết khí, khắc chế;
- hợp/xung/hình/hại/phá;
- cách cục khi đủ điều kiện;
- điều hậu và phù-ức tách riêng khi có khác biệt;
- dụng/hỷ/kỵ có điều kiện;
- đại vận tách khỏi nguyên cục.

## Kết nối AI Worker

Ứng dụng vẫn chạy offline để lập lá số và tạo tổng luận cục bộ. AI chuyên sâu là tùy chọn.

Khi người dùng cấu hình một AI Worker HTTPS, `autonomous.js` gửi endpoint cho Service Worker. Trang gọi đường dẫn cùng origin:

- `GET ./__hiep_ai_proxy__/health`
- `POST ./__hiep_ai_proxy__/analyze`

Service Worker mới chuyển tiếp sang Worker bên ngoài. Cách này giữ CSP của GitHub Pages chặt và không yêu cầu đưa API key vào frontend.

Worker phải trả JSON tương thích với giao diện hiện tại, tối thiểu:

```json
{
  "text": "nội dung luận giải",
  "usage": {
    "total_token_count": 1234
  }
}
```

API key của nhà cung cấp LLM phải lưu ở secret của Worker/backend, không commit lên GitHub và không lưu trong trình duyệt.

## An toàn và phạm vi

Tử Vi/Bát Tự là hệ diễn giải truyền thống, không phải mô hình khoa học chứng minh quan hệ nhân quả. AI không được dùng lá số để khẳng định chắc chắn tử vong, bệnh nặng, phá sản, ngoại tình, phạm tội hoặc thay thế tư vấn y tế/pháp lý/tài chính.

## Test

```bash
npm run test:syntax
node --check hiep-tuvi-ai.js
npm test
```

Test riêng `tests/hiep-tuvi-ai.test.mjs` kiểm tra prompt từng cung, checklist sao, quan hệ cung, Bát Tự và quality gate.
