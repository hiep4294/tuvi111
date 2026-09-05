# Hiep TuVi AI — AUTO FULL REPORT / KNOWLEDGE BASE V2 / WEBGPU

`tuvi111` tự tính toàn bộ FACT/CALC kỹ thuật. Sau khi lập lá số xong, Hiep TuVi AI tự chạy trên WebGPU của thiết bị và viết báo cáo theo cấu trúc `@Hiep Tuvi`.

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
Hiep TuVi Knowledge Base V2
  ├─ stars
  ├─ palaces + geometry
  ├─ combinations/formations
  ├─ Tứ Hóa / Tuần-Triệt / Tràng Sinh / time layers
  ├─ Bát Tự / Ngũ Hành
  └─ schools + provenance + confidence
  ↓
Rule retriever chọn đúng rule liên quan
  ↓
Hiep TuVi prompt engine
  ↓
Web Worker + WebLLM + WebGPU
  ↓
AUTO FULL REPORT
```

## Knowledge Base V2

Dữ liệu được tách thành các module cùng repo:

- `knowledge/stars.js` — 14 chính tinh + nhóm phụ/cát/sát/Tứ Hóa trọng yếu;
- `knowledge/palaces.js` — 12 cung, tam hợp, đối cung và liên đới chủ đề;
- `knowledge/combinations.js` — các bộ sao/cách cục và điều kiện hình học;
- `knowledge/structures.js` — Ngũ Hành, tam phương, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Mệnh–Thân, vận hạn, red-team;
- `knowledge/bazi.js` — Bát Tự, Thập Thần, vượng suy, tương tác và chống shortcut;
- `knowledge/schools.js` — `NAM_PHAI_TAM_HOP`, `TU_HOA`, `TRUNG_CHAU`, `CLASSICAL`, `MENH_LY_THIEN_CO` + provenance.

`hiep-tuvi-knowledge.js` là retriever. Nó không đẩy toàn bộ dữ liệu vào Qwen. Với mỗi phần luận, retriever chỉ lấy:

- rule của cung đang xét;
- rule của sao thực sự xuất hiện trong cung/tam phương/đối cung;
- bộ sao có đủ thành viên ứng viên để đáng kiểm tra;
- Tứ Hóa/Tuần-Triệt/Tràng Sinh chỉ khi chart có dữ liệu liên quan;
- Bát Tự và provenance chỉ ở đúng phần cần dùng.

Mỗi rule quan trọng có tối thiểu:

```text
RULE-ID | SCHOOL | SOURCE_LEVEL | RULE_CONFIDENCE | điều kiện | ngoại lệ
```

Điều này giúp model local không phải “nhớ Tử Vi” bằng kiến thức huấn luyện chung.

## Provenance

Source level:

- `A`: nguồn gốc/trường phái truy nguyên rõ;
- `B`: bài giảng dài, có hệ thống;
- `C`: tài liệu tổng hợp có cấu trúc;
- `D`: clip ngắn/câu phú rời/nguồn thiếu bối cảnh.

Rule confidence:

- `CORE`
- `SUPPORTED`
- `CONDITIONAL`
- `DISPUTED`
- `WEAK`

Nguồn D không được làm căn cứ duy nhất cho claim `STRONG`.

## Luồng người dùng

1. Nhập thông tin sinh.
2. Bấm **Lập lá số**.
3. `tuvi111` tính và hiển thị lá số ngay.
4. Hiep TuVi AI tự bắt đầu; không cần bấm nút AI.
5. Báo cáo được ghi trực tiếp vào khu vực tổng luận.
6. Nút **AI luận giải lại** chỉ dùng khi muốn chạy lại.

Nếu WebGPU/model không chạy được, bản tổng luận quy tắc cục bộ vẫn được giữ làm fallback.

## Vì sao chia 8 lượt nội bộ?

Qwen3 4B trong WebLLM dùng context 4096 token. Báo cáo được chia nội bộ thành 8 lượt nhỏ nhưng UI ghép thành một báo cáo liên tục:

1. Data Quality + Mệnh + Phụ Mẫu.
2. Phúc Đức + Điền Trạch.
3. Quan Lộc + Nô Bộc.
4. Thiên Di + Tật Ách.
5. Tài Bạch + Tử Tức.
6. Phu Thê + Huynh Đệ.
7. Tứ Trụ Bát Tự + Ngũ Hành Âm Dương.
8. Đối chiếu hệ + Red-team + Tổng kết + Hành động + 3–5 góc nhìn dễ bỏ sót.

Quy tắc cứng: đủ 12 cung trước Bát Tự và tổng kết.

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

## Bát Tự

Sau đủ 12 cung mới đến Bát Tự: 4 trụ → Nhật chủ → tháng lệnh/khí mùa → vượng suy → can chi → hợp/xung/hình/hại/phá → Thập Thần → dụng/hỷ/kỵ khi đủ evidence → đại vận → sensitivity giờ/tiết khí → Ngũ Hành.

Không dùng cách “thiếu hành nào bổ hành đó”. Không đếm hành cơ học để kết luận vượng suy.

## Model local

- `Qwen3-1.7B-q4f16_1-MLC` — máy yếu.
- `Qwen3-4B-q4f16_1-MLC` — mặc định.
- `Qwen3-8B-q4f16_1-MLC` — máy mạnh.

Nếu model đã chọn không chạy được, hệ thống tự thử model nhẹ hơn. Controller giới hạn output mỗi lượt để chừa context cho FACT/CALC + knowledge.

## Offline

Service Worker cache toàn bộ Knowledge Base V2 cùng engine và ứng dụng. Sau khi runtime/model WebLLM đã được tải vào cache trình duyệt, phần rule Tử Vi/Bát Tự không cần gọi API ngoài.

## Test

```bash
npm run test:syntax
npm test
```

Gate chính:

- đủ 12 cung trước Bát Tự/tổng kết;
- 2 cung/lượt để bảo vệ context;
- tự chạy sau khi lập lá số;
- rule retriever chỉ lấy rule liên quan;
- rule có SCHOOL/provenance/confidence;
- knowledge pack bị giới hạn kích thước;
- tất cả module KB nằm trong offline cache;
- engine deterministic không bị AI sửa.
