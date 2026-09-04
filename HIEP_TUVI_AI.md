# Hiep TuVi Local AI — SUMMARY_ONLY / WEBGPU

`tuvi111` tự tính toàn bộ phần kỹ thuật. AI chỉ đọc kết quả đã tính để **đối chiếu, phản biện, kết luận và tổng kết cuối**.

Bản này ưu tiên **chạy model trực tiếp trong trình duyệt trên GitHub Pages bằng WebGPU**. Không cần VPS, không cần API key và không cần Gemini cho luồng chính.

## Kiến trúc

```text
GitHub Pages
    ↓
Thông tin sinh
    ↓
tuvi111 engine (Pyodide/Python trên thiết bị)
    ├─ an sao + 12 cung
    ├─ Can Chi / Cục / Mệnh–Thân
    ├─ Tứ Hóa / Tuần–Triệt / Tràng Sinh
    ├─ quan hệ cung
    ├─ Bát Tự / Ngũ Hành / đại vận / lưu niên
    └─ tổng luận cục bộ
    ↓
Evidence nén + khóa FACT/CALC
    ↓
Hiep TuVi Local AI — SUMMARY_ONLY
    ↓
Web Worker + WebLLM + WebGPU trên máy người dùng
    ├─ tổng hợp Mệnh–Tài–Quan, Mệnh–Di, Mệnh–Thân
    ├─ chọn Tứ Hóa/Tuần–Triệt/Tràng Sinh có sức cấu trúc
    ├─ đối chiếu Tử Vi ↔ Bát Tự ↔ Ngũ Hành
    ├─ red-team
    └─ kết luận cuối + ứng dụng thực tế
    ↓
1 báo cáo tổng kết
```

## “Chạy trực tiếp trên GitHub” nghĩa là gì?

GitHub Pages là static hosting, không phải GPU server chạy LLM nền. Vì vậy kiến trúc đúng là:

- GitHub host HTML/JS/Pyodide và lớp điều phối AI;
- khi mở trang, Web Worker tải WebLLM/model cần thiết;
- model được thực thi bằng **WebGPU của chính thiết bị đang mở trang**;
- trọng số model được cache trong trình duyệt bằng IndexedDB;
- sau khi model/runtime đã có trong cache, các lần chạy tiếp theo không cần tải lại toàn bộ model.

Không gửi prompt lá số tới một API AI bên ngoài trong chế độ local.

## Model local

Mặc định:

- `Qwen3-4B-q4f16_1-MLC` — khoảng 3.4 GB VRAM.

Có thêm:

- `Qwen3-1.7B-q4f16_1-MLC` — khoảng 2.0 GB VRAM, dành cho máy yếu;
- `DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC` — khoảng 5.1 GB VRAM, dành cho máy mạnh.

Model được chọn trong giao diện. `Qwen3 4B` là cấu hình cân bằng mặc định.

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

### AI local chỉ làm

1. Đọc evidence cuối do `tuvi111` tạo.
2. Chọn cấu trúc quan trọng nhất thay vì kể lại mọi sao.
3. Đối chiếu các hệ nhưng không ép chúng đồng thuận.
4. Phản biện chính kết luận của mình.
5. Đưa ra kết luận tổng quát, điểm mạnh, điểm dễ lệch và ứng dụng thực tế.
6. Với trẻ em, ưu tiên khí chất, học tập, tự điều tiết, môi trường và cách nuôi dạy.

AI **không được** tự an lại lá số và không chạy lại 12 cung bằng LLM.

## Evidence nén cho model trình duyệt

`hiep-tuvi-ai.js` có hai profile prompt:

- `buildSummaryPrompt()` — prompt đầy đủ cho fallback cloud;
- `buildBrowserSummaryPrompt()` — prompt nén cho model WebGPU context nhỏ hơn.

Prompt nén vẫn giữ:

- Mệnh/Thân/Cục;
- toàn bộ tên sao theo từng cung ở dạng gọn;
- miếu/vượng/đắc/hãm và hành sao khi engine có;
- Tứ Hóa/Tuần/Triệt/Tràng Sinh nằm trong evidence;
- Bát Tự;
- quan hệ cung/tổng hợp quan trọng;
- tổng luận cục bộ làm evidence phụ.

Không đổi FACT/CALC của engine để giảm token.

## Số lần chạy model

Bình thường: **1 lần**.

Nếu quality gate phát hiện kết luận quá ngắn hoặc thiếu Mệnh–Tài–Quan, Mệnh–Di, Bát Tự, Tứ Hóa, phản biện hoặc kết luận cuối: tối đa **1 lần sửa lại**.

## Quality gate

Phần AI phải có:

- kết luận tổng quát;
- Mệnh–Tài–Quan / Mệnh–Di / Mệnh–Thân;
- đối chiếu Bát Tự;
- Tứ Hóa/Tuần–Triệt/Tràng Sinh có sức cấu trúc;
- điểm mạnh và điểm dễ lệch;
- ứng dụng thực tế;
- red-team/phản biện;
- 3–5 góc nhìn dễ bỏ sót;
- kết luận cuối: lõi mạnh nhất, rủi ro lớn nhất, chìa khóa phát triển.

## File chính

- `hiep-tuvi-ai.js` — xây evidence/prompt + quality gate;
- `browser-ai.js` — controller AI trong trang;
- `browser-ai-worker.js` — Web Worker tải WebLLM và chạy inference WebGPU;
- `autonomous.js` — nối AI local vào UI hiện tại;
- `service-worker.js` — cache các file runtime cục bộ;
- `worker/` — cloud fallback cũ, không bắt buộc.

## Fallback

Cloud Worker cũ vẫn được giữ để rollback/tương thích, nhưng bị ẩn khỏi luồng chính. Nếu thiết bị không hỗ trợ WebGPU thì local AI không thể chạy; tuvi111 vẫn lập lá số và tổng luận cục bộ bình thường.

## An toàn

Tử Vi/Bát Tự là hệ diễn giải truyền thống. AI không được dùng lá số để khẳng định chắc chắn tử vong, bệnh nặng, tai họa, phá sản, ngoại tình, phạm tội hoặc thay thế tư vấn y tế/pháp lý/tài chính.

## Test

```bash
npm run test:syntax
npm test
```

Test bảo đảm:

- model local chạy qua Web Worker/WebGPU;
- đúng model ID có trong WebLLM;
- evidence trình duyệt được nén;
- AI chỉ làm `SUMMARY_ONLY`;
- không quay lại luồng 15 bước;
- tuvi111/offline cache vẫn hoạt động độc lập.
