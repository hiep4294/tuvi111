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
Hiep TuVi knowledge pack + Hiep TuVi prompt engine
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
5. Báo cáo được ghi trực tiếp vào khu vực trước đây là **Tổng luận cục bộ**.
6. Nút **AI luận giải lại** chỉ dùng khi muốn chạy lại.

Nếu WebGPU/model không chạy được, bản tổng luận quy tắc cục bộ vẫn được giữ làm fallback.

## Vì sao chia 8 lượt nội bộ?

Qwen3 4B trong WebLLM dùng context 4096 token. Để không làm mất evidence hoặc cắt phần trả lời, báo cáo được chia nội bộ thành **8 lượt nhỏ**, nhưng UI ghép thành một báo cáo liên tục:

1. Data Quality + Mệnh + Phụ Mẫu.
2. Phúc Đức + Điền Trạch.
3. Quan Lộc + Nô Bộc.
4. Thiên Di + Tật Ách.
5. Tài Bạch + Tử Tức.
6. Phu Thê + Huynh Đệ.
7. Tứ Trụ Bát Tự + Ngũ Hành Âm Dương.
8. Đối chiếu hệ + Red-team + Tổng kết + Hành động + 3–5 góc nhìn dễ bỏ sót.

Như vậy vẫn giữ quy tắc cứng: **đủ 12 cung trước Bát Tự và tổng kết**.

## Chuẩn mỗi cung

AI phải đi qua:

- nền cung / địa chi / Ngũ Hành;
- chính tinh và phụ tinh;
- Ngũ Hành cung ↔ sao ↔ Mệnh;
- bộ sao/cách cục và trạng thái `complete/partial/broken`;
- Tràng Sinh;
- tam phương tứ chính + đối cung;
- nhị hợp + giáp cung;
- Tứ Hóa theo mạng nguồn → sao → cung → tác động;
- Tuần/Triệt như bộ điều biến, không phải nút xóa;
- Mệnh–Thân và cung liên đới;
- điểm hỗ trợ / điểm phá;
- kết luận `Mạnh / Yếu / Điều kiện / STRONG|CONDITIONAL|CONTESTED|INSUFFICIENT`.

AI không được dùng “một sao = một kết luận”.

## Knowledge pack Hiep Tuvi

`hiep-tuvi-knowledge.js` cung cấp cho model local:

- phạm vi 12 cung;
- lõi nghĩa 14 chính tinh;
- nhóm phụ tinh/cát/sát tinh có sức cấu trúc;
- bộ sao như Tử Phủ Vũ Tướng, Sát Phá Tham, Cơ Nguyệt Đồng Lương, Nhật Nguyệt, Cơ Cự, Cự Nhật, Cơ Lương, Vũ Tham, Liêm Tham, Liêm Sát, Khoa Quyền Lộc, Lộc Mã, Xương Khúc, Khôi Việt, Tả Hữu, Không Kiếp, Kình Đà, Hỏa Linh, Hình Kỵ;
- Tứ Hóa có hướng;
- Tuần/Triệt;
- Tràng Sinh;
- Mệnh–Thân;
- quy tắc Bát Tự và red-team.

Knowledge pack **không nạp toàn bộ vào mọi request**. Hệ thống chỉ chọn các sao/bộ sao liên quan tới 2 cung đang luận và quan hệ tam phương/đối cung của chúng để giữ context gọn.

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

Phần cuối kiểm:

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

Nếu model đã chọn không chạy được, hệ thống tự thử model nhẹ hơn. Controller giới hạn tối đa 1250 output token/lượt để chừa context cho evidence/knowledge.

## Ranh giới trách nhiệm

### `tuvi111`

Tính FACT/CALC. AI không được sửa các dữ kiện này.

### Hiep TuVi AI

Chỉ diễn giải và tổng hợp FACT/CALC đã khóa. Không tự an lại sao, đổi vị trí cung, đổi Can Chi/Cục/Tứ Hóa/Tràng Sinh hoặc bịa dữ liệu thiếu.

## Trẻ em

Nếu chủ thể dưới 18 tuổi, AI ưu tiên khí chất, học tập, tự điều tiết, môi trường và cách cha mẹ hỗ trợ. Không dự đoán cứng nghề nghiệp, hôn nhân, tài chính hoặc bệnh tật tương lai; phần cuối có gợi ý nuôi dạy thực tế và điều nên tránh.

## File chính

- `hiep-tuvi-ai.js` — kế hoạch 8 phần, evidence nén, prompt Hiep Tuvi, quality gate.
- `hiep-tuvi-knowledge.js` — knowledge pack theo sao/cung liên quan.
- `autonomous.js` — tự kích hoạt AI sau `generate`, xử lý hủy báo cáo cũ và ghép các phần.
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
- 2 cung/lượt để bảo vệ context;
- tự chạy sau khi lập lá số;
- Data Quality có trước 12 cung;
- mỗi cung có relationship stack;
- có Bát Tự/Ngũ Hành, Red-team, tổng kết, hành động và góc nhìn bổ sung;
- knowledge pack chỉ nạp phần liên quan;
- engine deterministic không bị AI sửa.
