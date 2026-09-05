# Hiep TuVi AI — AUTO FULL REPORT / WEBGPU

`tuvi111` tự tính toàn bộ FACT/CALC kỹ thuật. Sau khi lập lá số xong, Hiep TuVi AI **tự chạy** trên WebGPU của thiết bị và viết báo cáo theo cấu trúc `@Hiep Tuvi`.

Không cần VPS, API key hoặc Gemini cho luồng chính.

## Kiến trúc

```text
Thông tin sinh
  ↓
tuvi111 deterministic engine
  ├─ lịch pháp / Can Chi / Cục / Mệnh–Thân
  ├─ 12 cung + sao + miếu/vượng/đắc/hãm
  ├─ Tứ Hóa / Tuần–Triệt / Tràng Sinh
  ├─ tam phương / đối cung / nhị hợp / giáp cung
  ├─ Bát Tự / Ngũ Hành / đại vận
  └─ relations + combined analysis
  ↓
FACT/CALC khóa
  ↓
Hiep TuVi AI local
  ↓
Web Worker + WebLLM + WebGPU
  ↓
AUTO FULL REPORT
```

## Luồng người dùng

1. Nhập thông tin sinh.
2. Bấm **Lập lá số**.
3. `tuvi111` tính và hiển thị lá số ngay.
4. Hiep TuVi AI tự bắt đầu; không cần bấm nút AI.
5. Báo cáo được ghi trực tiếp vào khu vực dưới Bát Tự.
6. Nút **AI luận giải lại** chỉ dùng khi muốn chạy lại.

Nếu WebGPU/model không chạy được, bản tổng luận quy tắc cục bộ vẫn được giữ làm fallback.

## Cấu trúc báo cáo

Để model trình duyệt không bị cắt context, nội bộ chia 6 lượt nhưng UI ghép thành một báo cáo liên tục:

1. Data Quality + Mệnh + Phụ Mẫu + Phúc Đức.
2. Điền Trạch + Quan Lộc + Nô Bộc.
3. Thiên Di + Tật Ách + Tài Bạch.
4. Tử Tức + Phu Thê + Huynh Đệ.
5. Tứ Trụ Bát Tự + Ngũ Hành Âm Dương.
6. Đối chiếu hệ + Red-team + Tổng kết + Hành động + 3–5 góc nhìn dễ bỏ sót.

## Chuẩn mỗi cung

AI phải đi qua:

- nền cung / địa chi / Ngũ Hành;
- chính tinh và phụ tinh;
- Ngũ Hành cung ↔ sao ↔ Mệnh;
- bộ sao/cách cục và trạng thái `complete/partial/broken`;
- Tràng Sinh;
- tam phương tứ chính + đối cung;
- nhị hợp + giáp cung;
- Tứ Hóa;
- Tuần/Triệt;
- Mệnh–Thân và cung liên đới;
- điểm hỗ trợ / điểm phá;
- kết luận `Mạnh / Yếu / Điều kiện / STRONG|CONDITIONAL|CONTESTED|INSUFFICIENT`.

AI không được dùng “một sao = một kết luận”.

## Bát Tự

Sau đủ 12 cung mới đến Bát Tự:

- 4 trụ;
- Nhật chủ;
- tháng lệnh / khí mùa;
- vượng suy;
- can chi và tương tác;
- Thập Thần;
- dụng/hỷ/kỵ chỉ khi evidence đủ;
- đại vận;
- sensitivity giờ sinh / tiết khí;
- Ngũ Hành Âm Dương.

Không dùng cách “thiếu hành nào bổ hành đó”.

## Red-team và tổng kết

Phần cuối phải kiểm:

- cherry-picking;
- đọc một sao độc lập;
- cách cục thiếu điều kiện;
- trộn nguyên cục/lưu niên;
- dependency chung giữa Tử Vi và Bát Tự;
- khác biệt trường phái.

Nếu phản biện đúng, AI phải hạ hoặc sửa kết luận.

## Model local

- `Qwen3-1.7B-q4f16_1-MLC` — máy yếu.
- `Qwen3-4B-q4f16_1-MLC` — mặc định.
- `Qwen3-8B-q4f16_1-MLC` — máy mạnh.

Nếu model đã chọn không chạy được, hệ thống tự thử model nhẹ hơn.

## Ranh giới trách nhiệm

### `tuvi111`

Tính FACT/CALC. AI không được sửa các dữ kiện này.

### Hiep TuVi AI

Chỉ diễn giải và tổng hợp FACT/CALC đã khóa. Không tự an lại sao, đổi vị trí cung, đổi Can Chi/Cục/Tứ Hóa/Tràng Sinh hoặc bịa dữ liệu thiếu.

## Trẻ em

Nếu chủ thể dưới 18 tuổi, AI ưu tiên:

- khí chất;
- học tập;
- tự điều tiết;
- môi trường;
- cách cha mẹ hỗ trợ.

Không dự đoán cứng nghề nghiệp, hôn nhân, tài chính hoặc bệnh tật tương lai; phần cuối phải có gợi ý nuôi dạy thực tế và điều nên tránh.

## File chính

- `hiep-tuvi-ai.js` — kế hoạch 6 phần, prompt Hiep Tuvi, quality gate.
- `autonomous.js` — tự kích hoạt AI sau khi `generate` hoàn tất và ghép các phần.
- `browser-ai.js` / `browser-ai-worker.js` — WebLLM + WebGPU.
- `offline-summary.js` — fallback quy tắc cục bộ.
- `service-worker.js` — cache runtime.

## Test

```bash
npm run test:syntax
npm test
```

Gate chính:

- đủ 12 cung trước Bát Tự/tổng kết;
- tự chạy sau khi lập lá số;
- Data Quality có trước 12 cung;
- mỗi cung có relationship stack;
- Bát Tự/Ngũ Hành đứng sau 12 cung;
- có Red-team, tổng kết, hành động và góc nhìn bổ sung;
- engine deterministic không bị AI sửa.
