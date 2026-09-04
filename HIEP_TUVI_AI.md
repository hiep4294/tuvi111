# Hiep TuVi AI — SUMMARY_ONLY

`tuvi111` tự tính và hiển thị toàn bộ phần kỹ thuật. AI chỉ đọc kết quả đã tính để **đối chiếu, phản biện, kết luận và tổng kết cuối**.

## Kiến trúc

```text
Thông tin sinh
    ↓
tuvi111 engine (Pyodide/Python)
    ├─ an sao + 12 cung
    ├─ Can Chi / Cục / Mệnh–Thân
    ├─ Tứ Hóa / Tuần–Triệt / Tràng Sinh
    ├─ quan hệ cung
    ├─ Bát Tự / Ngũ Hành / đại vận / lưu niên
    └─ tổng luận cục bộ
    ↓
Evidence package đã khóa
    ↓
Hiep TuVi AI — SUMMARY_ONLY
    ├─ tổng hợp Mệnh–Tài–Quan, Mệnh–Di, cung có Thân
    ├─ chọn Tứ Hóa/Tuần–Triệt/Tràng Sinh có sức cấu trúc
    ├─ đối chiếu Tử Vi ↔ Bát Tự ↔ Ngũ Hành
    ├─ red-team
    └─ kết luận cuối + ứng dụng thực tế
    ↓
1 báo cáo tổng kết
```

## Ranh giới trách nhiệm

### `tuvi111` tự chạy, không cần AI

- quy đổi ngày giờ và lịch pháp;
- lập 12 cung;
- an chính tinh/phụ tinh;
- miếu/vượng/đắc/hãm theo cấu hình engine;
- Mệnh, Thân, Cục;
- tam phương/tứ chính và quan hệ cung;
- Tứ Hóa;
- Tuần/Triệt;
- Tràng Sinh;
- Bát Tự, Ngũ Hành, đại vận/lưu niên khi có dữ liệu;
- hiển thị JSON, bảng lá số, quan hệ cung và tổng luận cục bộ.

### AI chỉ làm

1. Đọc evidence cuối do `tuvi111` tạo.
2. Chọn những cấu trúc quan trọng nhất thay vì kể lại mọi sao.
3. Đối chiếu các hệ nhưng không ép chúng đồng thuận.
4. Phản biện chính kết luận của mình.
5. Đưa ra kết luận tổng quát, điểm mạnh, điểm dễ lệch và ứng dụng thực tế.
6. Với trẻ em, ưu tiên khí chất, học tập, tự điều tiết, môi trường và cách nuôi dạy.

AI **không được** viết lại 12 cung như 12 request riêng và không được tự an lại lá số.

## Số lần gọi AI

Bình thường: **1 request**.

Nếu quality gate phát hiện kết luận quá ngắn hoặc thiếu các trục bắt buộc: tối đa **1 request sửa lại**.

Do đó chi phí và độ trễ thấp hơn đáng kể so với kiến trúc 15 bước trước.

## Quality gate phần kết luận

Phần AI phải có tối thiểu:

- kết luận tổng quát;
- Mệnh–Tài–Quan / Mệnh–Di / cung có Thân;
- đối chiếu Bát Tự;
- Tứ Hóa/Tuần–Triệt/Tràng Sinh có sức cấu trúc;
- điểm mạnh và điểm dễ lệch;
- ứng dụng thực tế;
- red-team/phản biện;
- 3–5 góc nhìn dễ bỏ sót;
- kết luận cuối: lõi mạnh nhất, rủi ro lớn nhất, chìa khóa phát triển.

## Dòng dữ liệu

`hiep-tuvi-ai.js` tạo một evidence package gọn từ chart JSON:

- `heaven`;
- 12 `palaces` + toàn bộ sao đã an;
- `bazi`;
- `annual`;
- `relations`;
- `combined_analysis`;
- metadata engine/chart.

AI chỉ đọc evidence này. Nếu phát hiện mâu thuẫn, phải báo mâu thuẫn; không tự sửa FACT/CALC.

## Kết nối AI Worker

Ứng dụng vẫn chạy offline cho phần lập lá số. AI tổng kết là tùy chọn.

Frontend gọi same-origin proxy:

- `GET ./__hiep_ai_proxy__/health`
- `POST ./__hiep_ai_proxy__/analyze`

Service Worker chuyển tiếp tới AI Worker HTTPS. API key lưu trong secret backend/Cloudflare Worker, không commit lên GitHub và không lưu ở trình duyệt.

Worker mẫu dùng Gemini API. Model hiện mặc định `gemini-3.8-flash`, có thể thay bằng biến môi trường mà không thay engine `tuvi111`.

## An toàn

Tử Vi/Bát Tự là hệ diễn giải truyền thống. AI không được dùng lá số để khẳng định chắc chắn tử vong, bệnh nặng, tai họa, phá sản, ngoại tình, phạm tội hoặc thay thế tư vấn y tế/pháp lý/tài chính.

## Test

```bash
npm run test:syntax
node --check hiep-tuvi-ai.js
npm test
```

Các test Hiep bảo đảm AI giữ đúng profile `SUMMARY_ONLY` và không quay lại luồng 15 bước.
